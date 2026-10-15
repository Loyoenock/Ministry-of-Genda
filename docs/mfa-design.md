# Multi-Factor Authentication (MFA) Architecture & Technical Design

## 1. Executive Summary

This document specifies the technical design for Multi-Factor Authentication (MFA) within the Republic of Uganda Ministry of Gender, Labour and Social Development (MGLSD) Diagnostic Application. 

To safeguard institutional labour diagnostic assessments, sensitive compliance records, and administrative privileges, **Time-based One-Time Password (TOTP, RFC 6238)** MFA is mandated for all administrative accounts (`role === 'admin'`).

---

## 2. Security Threat Model & Objectives

1. **Credential Stuffing & Phishing Defense**: Prevent unauthorized administrative takeover even if a primary password is leaked or compromised.
2. **Privilege Segregation (AAL1 vs. AAL2)**: Differentiate standard interviewer sessions (Authenticator Assurance Level 1, AAL1) from elevated administrative sessions (AAL2).
3. **Failsafe Account Recovery**: Provide structured, cryptographically secure recovery mechanisms without compromising the zero-trust administrative boundary.

---

## 3. Enrolment Flow

Enrolment occurs when an administrator is first provisioned, promoted to admin, or voluntarily initiates MFA from their account settings.

```
[Admin Signs In (AAL1)] 
         │
         ▼
[Check Role & Enrolled Factors]
         │
         ├───► If role == 'admin' AND factors.totp.length == 0:
         │         Prompt MFA Enrolment Wizard
         │
         ▼
[Call supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'MGLSD Diagnostic' })]
         │
         ├───► Returns factorId, QR Code URI, and Secret Key
         │
         ▼
[Display QR Code & Base32 Manual Secret]
         │
         ▼
[Admin Scans QR via Google Authenticator / Microsoft Authenticator]
         │
         ▼
[Admin Enters First 6-digit TOTP Code]
         │
         ▼
[Call supabase.auth.mfa.challengeAndVerify({ factorId, code })]
         │
         ├───► If Valid: Factor verified & activated
         │
         ▼
[Generate & Display 8 Single-Use Recovery Codes]
         │
         ├───► Store SHA-256 hashes in database
         │
         ▼
[Session Elevated to AAL2]
```

### Technical Implementation Details:
- **API Call**:
  ```typescript
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'MGLSD Diagnostic',
    friendlyName: user.email,
  });
  ```
- **QR Code Rendering**: Render `data.totp.qr_code` using an SVG/Canvas QR component with high contrast. Also display the plaintext secret key (`data.totp.secret`) formatted in 4-character chunks for manual entry into hardware tokens or desktop authenticators.
- **Verification Call**:
  ```typescript
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: data.id,
    code: userEnteredSixDigitCode,
  });
  ```

---

## 4. Challenge on Login Flow

Every administrative sign-in requires secondary factor verification before grant of access to administrative functions.

```
[User Signs In with Email & 12+ Character Password]
                     │
                     ▼
           [Supabase Auth (AAL1)]
                     │
                     ▼
        [Inspect Profile & JWT Claims]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  [Role: interviewer]     [Role: admin]
         │                       │
         ▼                       ▼
   [Grant Access]     [Check Active AAL]
                             │
                             ├───► If AAL2: Grant Access
                             │
                             └───► If AAL1:
                                     │
                                     ▼
                      [Fetch Factors: mfa.listFactors()]
                                     │
                                     ▼
                      [Render <MfaChallengeModal />]
                                     │
                                     ▼
                      [Create Challenge: mfa.challenge({ factorId })]
                                     │
                                     ▼
                      [Admin Submits 6-digit TOTP Code]
                                     │
                                     ▼
                      [Verify: mfa.verify({ factorId, challengeId, code })]
                                     │
                      ┌──────────────┴──────────────┐
                      ▼                             ▼
                 [Success]                      [Failure]
                      │                             │
                      ▼                             ▼
            [Elevate to AAL2]              [Show Error / Rate Limit]
                      │
                      ▼
           [Unlock Admin Console]
```

### Technical Implementation Details:
- **Session Check**:
  ```typescript
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (userRole === 'admin' && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
    // Intercept navigation; open MFA challenge dialog
  }
  ```
- **Challenge Creation & Verification**:
  ```typescript
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
    factorId: primaryFactor.id,
  });

  const { data: verifyData, error: verifyErr } = await supabase.auth.mfa.verify({
    factorId: primaryFactor.id,
    challengeId: challenge.id,
    code: enteredCode,
  });
  ```
- **Post-Verification**: Once verified, the Supabase client automatically refreshes the JWT with `aal: 'aal2'`.

---

## 5. Recovery & Failsafe Architecture

### 5.1 Single-Use Backup Recovery Codes
During initial enrolment, 8 single-use alphanumeric recovery codes (e.g. `XXXX-XXXX-XXXX`) are generated client-side:
- Codes are hashed using `SHA-256` before persistence into `public.admin_mfa_recovery_codes` table.
- Raw recovery codes are displayed once to the admin with a copy-to-clipboard and `.txt` download button.
- When an admin loses their mobile authenticator, they can click **"Use a backup recovery code"** on the challenge modal.
- Entering a valid recovery code marks that specific code as `used = true` and grants temporary elevated access, prompting the user to re-enrol their authenticator device.

### 5.2 Superadmin / Database Operator Emergency Reset
If an administrator loses both their authenticator device and all recovery codes:
- A fellow Super Administrator or Database Operator can unbind the factor via Supabase SQL Editor:
  ```sql
  -- Remove enrolled TOTP factor for target user
  DELETE FROM auth.mfa_factors
  WHERE user_id = 'target-user-uuid-here';
  
  -- Audit event log
  INSERT INTO public.audit_events (action, actor_id, details)
  VALUES ('MFA_FACTOR_RESET_BY_OPERATOR', auth.uid(), '{"target_user": "target-user-uuid-here"}');
  ```
- On next login, the user will authenticate with password (AAL1) and be strictly guided through fresh MFA enrolment.

---

## 6. Database Schema & RLS Policy Enforcement

To ensure zero-trust compliance, administrative operations (such as deleting interviews, managing question catalogues, and editing roles) can enforce AAL2 at the database level:

```sql
-- Example RLS Policy enforcing AAL2 for destructive admin operations
CREATE POLICY admin_destructive_actions_require_aal2
ON public.profiles
FOR UPDATE
USING (
  (auth.jwt() ->> 'aal') = 'aal2'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## 7. Rollout Plan

1. **Phase 1 (Current)**: Architecture design documentation (`docs/mfa-design.md`) and Supabase dashboard TOTP enablement.
2. **Phase 2**: Implementation of `<MfaEnrolmentWizard />` and `<MfaChallengeModal />` UI components.
3. **Phase 3**: Enforce AAL2 in PostgreSQL RLS policies for administrative mutation operations.
