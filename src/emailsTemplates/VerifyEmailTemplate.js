module.exports = (user, otp) => {
    return `
    <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 40px 0; width: 100%;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #f4f4f5; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                        <tr>
                            <td align="center" style="background-color: #171717; padding: 35px 20px;">
                                <img src="https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75" width="140" alt="Dream Cars" style="display: block;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px 30px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 8px; border: 2px dashed #cbd5e1;">
                                    <tr>
                                        <td align="center" style="padding: 40px 30px;">
                                            <h1 style="margin: 0 0 15px 0; font-size: 24px; color: #111827; text-transform: uppercase; letter-spacing: 2px;">Verify Your Account</h1>
                                            <div style="width: 50px; height: 3px; background-color: #EC6623; margin: 0 auto 25px auto;"></div>
                                            
                                            <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                                                Hi <strong>${user || 'there'}</strong>, welcome to Dream Cars!
                                            </p>
                                            <p style="margin: 0 0 25px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">To complete your registration and activate your account, please use the OTP code below.</p>

                                            
                                            <div style="margin: 30px 0;">
                                                <p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your OTP Code</p>
                                                <div style="display: inline-block; background-color: #f9fafb; border: 2px dashed #EC6623; border-radius: 8px; padding: 15px 30px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">
                                                    ${otp}
                                                </div>
                                            </div>
                                            

                                            
                                        </td>
                                    </tr>
                                </table>

                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                                    <tr>
                                        <td align="center" style="font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                            <span style="color: #EC6623;">✓</span> Guaranteed Draws &nbsp;&nbsp;|&nbsp;&nbsp; 
                                            <span style="color: #EC6623;">✓</span> Secure Entry &nbsp;&nbsp;|&nbsp;&nbsp; 
                                            <span style="color: #EC6623;">✓</span> Fixed Odds
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="background-color: #e5e7eb; padding: 25px;">
                                <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280;">
                                    Need help? <a href="${process.env.FRONTEND_URL}/contact" style="color: #EC6623; text-decoration: none; font-weight: 600;">Contact Support</a>
                                </p>
                                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                    © ${new Date().getFullYear()} Dream Cars. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    `;
};