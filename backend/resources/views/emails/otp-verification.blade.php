<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>North Cakes — Email Verification</title>
</head>
<body style="margin:0;padding:0;background:#F2EDE4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid rgba(79,95,82,0.08);">

          <tr>
            <td style="background:#4F5F52;padding:28px 24px;text-align:center;">
              <div style="display:inline-block;width:56px;height:56px;background:rgba(255,243,217,0.18);border-radius:16px;line-height:56px;font-size:26px;color:#FFF3D9;font-weight:800;text-align:center;">N</div>
              <h1 style="color:#FFF3D9;margin:14px 0 2px;font-size:22px;font-weight:800;letter-spacing:6px;">NORTH</h1>
              <p style="color:rgba(255,243,217,0.75);margin:0;font-size:12px;font-style:italic;letter-spacing:1px;">Cakes and Pastries</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 28px 8px;">
              <p style="color:#4F5F52;font-size:15px;font-weight:600;margin:0 0 8px;">Hello, {{ $name }}!</p>
              <p style="color:#A6A29A;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Thanks for signing up at North Cakes. Please use the verification code below to complete your email verification.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EDE4;border-radius:16px;border:1px solid rgba(79,95,82,0.1);">
                <tr>
                  <td align="center" style="padding:24px;">
                    <p style="color:#A6A29A;font-size:11px;font-weight:700;letter-spacing:1.5px;margin:0 0 10px;text-transform:uppercase;">Your Verification Code</p>
                    <p style="color:#4F5F52;font-size:36px;font-weight:800;letter-spacing:10px;margin:0;font-family:'Courier New',monospace;">{{ $otp }}</p>
                  </td>
                </tr>
              </table>

              <p style="color:#A6A29A;font-size:13px;line-height:1.6;margin:20px 0 0;text-align:center;">
                This code is valid for <strong style="color:#4F5F52;">{{ $expiryMinutes }} minutes</strong>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(212,160,61,0.08);border-radius:12px;border-left:3px solid #D4A03D;">
                <tr>
                  <td style="padding:12px 14px;">
                    <p style="color:#92670a;font-size:12px;line-height:1.5;margin:0;">
                      🔒 Never share this verification code with anyone. North Cakes staff will never ask you for this code.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 28px 28px;">
              <p style="color:#A6A29A;font-size:11px;line-height:1.6;margin:0;text-align:center;">
                If you didn't request this, you can safely ignore this email.
              </p>
              <p style="color:#4F5F52;font-size:11px;font-weight:700;letter-spacing:0.5px;margin:16px 0 0;text-align:center;">
                — North Cakes —
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>