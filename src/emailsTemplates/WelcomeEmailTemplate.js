
module.exports = (user) => {

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
                src="${process.env.FRONTEND_URL}/img/logoDC.png" 
                alt="DreamCar Logo" 
                style="
                    width:220px;
                    max-width:100%;
                    margin-bottom:24px;
                "
            />

            <h1 style="
                color:#ffffff;
                font-size:36px;
                margin:0;
                font-weight:700;
            ">
                Welcome To DreamCar 🚗
            </h1>

            <p style="
                color:#bdbdbd;
                margin-top:12px;
                font-size:15px;
                line-height:1.6;
            ">
                Your account is now verified and ready to go.
            </p>

        </div>

        <!-- BODY -->
        <div style="padding:40px 32px;">

            <p style="
                color:#333333;
                font-size:16px;
                line-height:1.7;
                margin-top:0;
            ">
                Hi ${user || "there"},
            </p>

            <p style="
                color:#555555;
                font-size:15px;
                line-height:1.8;
                margin-bottom:30px;
            ">
                Your email has been successfully verified and your DreamCar account is now active.
            </p>

            <!-- FEATURES -->
            <div style="
                border:1px solid #eeeeee;
                border-radius:14px;
                padding:28px 24px;
                background:#fafafa;
                margin-bottom:32px;
            ">

                <h3 style="
                    margin-top:0;
                    margin-bottom:20px;
                    color:#111111;
                    font-size:20px;
                ">
                    You can now:
                </h3>

                <ul style="
                    padding-left:18px;
                    margin:0;
                    color:#555555;
                    line-height:2;
                    font-size:15px;
                ">
                    <li>Enter live competitions</li>
                    <li>Purchase gift cards & credits</li>
                    <li>Use wallet payments</li>
                    <li>Track entries & winnings</li>
                    <li>Access exclusive featured competitions</li>
                </ul>

            </div>

            <!-- BUTTON -->
            <div style="text-align:center; margin:40px 0 10px;">

                <a
                    href="${process.env.FRONTEND_URL}"
                    style="
                        display:inline-block;
                        background:#42BE38;
                        color:#ffffff;
                        text-decoration:none;
                        padding:14px 34px;
                        border-radius:10px;
                        font-size:15px;
                        font-weight:700;
                    "
                >
                    START EXPLORING
                </a>

            </div>

            <p style="
                color:#666666;
                font-size:14px;
                line-height:1.7;
                text-align:center;
                margin-top:28px;
            ">
                We're excited to have you with us.
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
                Good luck 🍀<br/>
                <strong>DreamCar Competitions</strong>
            </p>

        </div>

    </div>

    `;
};

