
module.exports = (user) => {

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

        <img src="${process.env.LIVE_URL}/img/logoDC.png" alt="DreamCar Logo" style=" width: 220px; max-width: 100%; margin-bottom: 24px; object-fit: contain; " />

            <h1 style="
                color:#1a1a1a;
                margin:0;
                display:inline-block;
                background-color:#cbe3ff;
                padding:8px 16px;
                border-radius:8px;
                font-size:30px;
            ">
                Welcome To DreamCar 🚗
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
            Your email has been successfully verified and your DreamCar account is now active.
        </p>

        <!-- FEATURE BOX -->
        <div style="
            background:#fafafa;
            border-radius:14px;
            padding:28px 24px;
            margin:32px 0;
        ">

            <h3 style="
                margin-top:0;
                color:#111;
                font-size:20px;
                margin-bottom:18px;
            ">
                You can now:
            </h3>

            <ul style="
                padding-left:18px;
                color:#4a4a4a;
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

        <!-- CTA -->
        <div style="text-align:center; margin:40px 0;">

            <a
                href="${process.env.LIVE_URL}"
                style="
                    display:inline-block;
                    background:#EC6623;
                    color:#fff;
                    text-decoration:none;
                    padding:14px 30px;
                    border-radius:10px;
                    font-weight:bold;
                    font-size:15px;
                "
            >
                START EXPLORING
            </a>

        </div>

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
            Good luck and welcome aboard!<br/>
            <strong>The DreamCar Competitions Team</strong>
        </p>

    </div>

    `;
};

