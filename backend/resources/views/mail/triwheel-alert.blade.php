<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $mailSubject }}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;padding:32px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 32px;color:#fff;">
                            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;opacity:0.9;">TriWheel</p>
                            <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;">{{ $headline }}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi {{ $recipientName }},</p>
                            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#334155;white-space:pre-line;">{{ $bodyText }}</p>
                            @if ($actionUrl && $actionLabel)
                                <a href="{{ $actionUrl }}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 20px;border-radius:14px;">
                                    {{ $actionLabel }}
                                </a>
                            @endif
                            <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
                                This is an important account notification from TriWheel. Routine ride updates stay in your in-app notifications only.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
