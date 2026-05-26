
module.exports = (user, otp) => {

    return `

    <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 18px;
        overflow: hidden;
    ">

        <!-- HEADER -->
        <div style="
            background:#000000;
            padding:40px 30px;
            text-align:center;
        ">

            <img 
                src="https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75"
                alt="DreamCar Logo"
                style="
                    width:220px;
                    max-width:100%;
                    margin-bottom:24px;
                "
            />

            <h1 style="
                color:#ffffff;
                font-size:32px;
                margin:0;
                font-weight:700;
            ">
                Verify Your Account 🔐
            </h1>

            <p style="
                color:#bdbdbd;
                margin-top:12px;
                font-size:15px;
                line-height:1.6;
            ">
                Complete your DreamCar account verification.
            </p>

        </div>

        <!-- BODY -->
        <div style="padding:40px 30px;">

            <p style="
                color:#444444;
                font-size:16px;
                line-height:1.8;
                margin-top:0;
                margin-bottom:18px;
            ">
                Hi ${user || "there"},
            </p>

            <p style="
                color:#555555;
                font-size:15px;
                line-height:1.8;
                margin-bottom:30px;
            ">
                Welcome to DreamCar Competitions! Please use the verification code below to activate your account.
            </p>

            <!-- OTP BOX -->
            <div style="
                background:#fafafa;
                border:1px solid #eeeeee;
                border-radius:16px;
                padding:34px 24px;
                text-align:center;
                margin-bottom:30px;
            ">

                <p style="
                    margin-top:0;
                    margin-bottom:18px;
                    color:#666666;
                    font-size:13px;
                    font-weight:700;
                    letter-spacing:1px;
                    text-transform:uppercase;
                ">
                    Your Verification Code
                </p>

                <div style="
                    display:inline-block;
                    background:#ffffff;
                    border:2px dashed #EC6623;
                    border-radius:14px;
                    padding:18px 30px;
                    font-size:36px;
                    font-weight:700;
                    letter-spacing:8px;
                    color:#111111;
                ">
                    ${otp}
                </div>

                <p style="
                    margin-bottom:0;
                    margin-top:20px;
                    color:#888888;
                    font-size:14px;
                ">
                    This code expires in 10 minutes.
                </p>

            </div>

            <p style="
                color:#666666;
                font-size:14px;
                line-height:1.8;
                margin-bottom:0;
            ">
                If you did not create an account, you can safely ignore this email.
            </p>

        </div>

        <!-- FOOTER -->
        <div style="
            border-top:1px solid #eeeeee;
            padding:24px;
            text-align:center;
            background:#fafafa;
        ">

            <p style="
                margin:0;
                color:#888888;
                font-size:13px;
                line-height:1.8;
            ">
                Thank you for choosing us 🚗<br/>
                <strong>DreamCar Competitions</strong>
            </p>

        </div>

    </div>

    `;
};
