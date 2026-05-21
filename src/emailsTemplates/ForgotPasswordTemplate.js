
module.exports = (user, otp) => {

    return `
    
    <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 32px;
        border: 1px solid #f0f0f0;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    ">

        <!-- HEADER -->
        <div style="text-align:center; margin-bottom:32px;">

            <!-- LOGO -->
            <img
                src="${process.env.LIVE_URL}/img/logoDC.png"
                alt="DreamCar Logo"
                style="
                    width:220px;
                    max-width:100%;
                    margin-bottom:24px;
                    object-fit:contain;
                "
            />

            <!-- TITLE -->
            <h1 style="
                color:#1a1a1a;
                margin:0;
                display:inline-block;
                background-color:#cbe3ff;
                padding:8px 16px;
                border-radius:8px;
                font-size:30px;
            ">
                Password Reset 🔐
            </h1>

        </div>

        <!-- TEXT -->
        <p style="
            color:#4a4a4a;
            font-size:16px;
            line-height:1.7;
            margin-bottom:16px;
        ">
            Hi ${user || "there"},
        </p>

        <p style="
            color:#4a4a4a;
            font-size:16px;
            line-height:1.8;
            margin-bottom:28px;
        ">
            We received a request to reset your DreamCar account password.
            Please use the verification code below to continue.
        </p>

        <!-- OTP BOX -->
        <div style="
            background:#fafafa;
            padding:32px 24px;
            border-radius:12px;
            text-align:center;
            margin:32px 0;
        ">

            <p style="
                color:#666;
                margin-top:0;
                font-size:13px;
                text-transform:uppercase;
                font-weight:bold;
                letter-spacing:1px;
            ">
                Your Reset Code
            </p>

            <div style="
                display:inline-block;
                font-size:36px;
                font-weight:bold;
                letter-spacing:8px;
                color:#111;
                background:white;
                padding:16px 28px;
                border-radius:12px;
                border:2px dashed #EC6623;
                margin-top:10px;
            ">
                ${otp}
            </div>

            <p style="
                color:#888;
                font-size:14px;
                margin-top:18px;
                margin-bottom:0;
            ">
                This code will expire in 10 minutes.
            </p>

        </div>

        <!-- INFO -->
        <p style="
            color:#4a4a4a;
            font-size:15px;
            line-height:1.8;
            margin-bottom:32px;
        ">
            If you did not request a password reset,
            you can safely ignore this email.
        </p>

        <!-- FOOTER -->
        <hr style="
            border:none;
            border-top:1px solid #f0f0f0;
            margin:32px 0;
        " />

        <p style="
            color:#888;
            font-size:14px;
            text-align:center;
            margin:0;
        ">
            Stay secure,<br/>
            <strong>The DreamCar Competitions Team</strong>
        </p>

    </div>

    `;
};

