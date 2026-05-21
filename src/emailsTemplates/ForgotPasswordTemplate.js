module.exports = ({
    competitions = []
}) => {

    return `

    <div style="
        font-family: Arial, sans-serif;
        max-width: 650px;
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
                src="${process.env.LIVE_URL}/img/logoDC.png"
                alt="DreamCar"
                style="
                    width:220px;
                    max-width:100%;
                    margin-bottom:24px;
                "
            />

            <h1 style="
                color:#ffffff;
                margin:0;
                font-size:34px;
                font-weight:700;
            ">
                Welcome To DreamCar 🎉
            </h1>

            <p style="
                color:#bdbdbd;
                margin-top:12px;
                font-size:15px;
                line-height:1.6;
            ">
                You are now subscribed to our newsletter.
            </p>

        </div>

        <!-- BODY -->
        <div style="padding:40px 30px;">

            <p style="
                color:#444444;
                font-size:16px;
                line-height:1.8;
                margin-top:0;
                margin-bottom:24px;
            ">
                You’ll now receive:
            </p>

            <div style="
                background:#fafafa;
                border:1px solid #eeeeee;
                border-radius:16px;
                padding:24px;
                margin-bottom:34px;
            ">

                <ul style="
                    color:#555555;
                    line-height:32px;
                    padding-left:20px;
                    margin:0;
                    font-size:15px;
                ">
                    <li>Latest competitions</li>
                    <li>Luxury watch & car giveaways</li>
                    <li>Winner announcements</li>
                    <li>Exclusive offers & updates</li>
                </ul>

            </div>

            <h2 style="
                color:#111111;
                margin-bottom:22px;
                font-size:24px;
            ">
                Latest Competitions
            </h2>

            ${competitions.map(item => `

                <div style="
                    background:#fafafa;
                    border:1px solid #eeeeee;
                    border-radius:16px;
                    padding:24px;
                    margin-bottom:20px;
                ">

                    <h3 style="
                        margin:0 0 14px;
                        color:#111111;
                        font-size:22px;
                        line-height:1.4;
                    ">
                        ${item.title}
                    </h3>

                    <p style="
                        margin:0 0 10px;
                        color:#666666;
                        font-size:15px;
                        line-height:1.7;
                    ">
                        Ticket Price:
                        <strong>£${item.ticketPrice}</strong>
                    </p>

                    <p style="
                        margin:0;
                        color:#666666;
                        font-size:14px;
                        line-height:1.7;
                    ">
                        Enter now for your chance to win before tickets sell out.
                    </p>

                    <div style="margin-top:22px;">

                        <a
                            href="${process.env.FRONTEND_URL}/competition/${item.slug}"
                            style="
                                display:inline-block;
                                background:#42BE38;
                                color:#ffffff;
                                text-decoration:none;
                                padding:13px 24px;
                                border-radius:10px;
                                font-size:14px;
                                font-weight:700;
                            "
                        >
                            ENTER COMPETITION
                        </a>

                    </div>

                </div>

            `).join("")}

            <div style="
                margin-top:34px;
                text-align:center;
            ">

                <a
                    href="${process.env.FRONTEND_URL}"
                    style="
                        display:inline-block;
                        background:#EC6623;
                        color:#ffffff;
                        text-decoration:none;
                        padding:14px 32px;
                        border-radius:10px;
                        font-size:15px;
                        font-weight:700;
                    "
                >
                    VIEW ALL COMPETITIONS
                </a>

            </div>

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
                Dream big. Win bigger. 🚗<br/>
                <strong>DreamCar Competitions</strong>
            </p>

        </div>

    </div>

    `;
};