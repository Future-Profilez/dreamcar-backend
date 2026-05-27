
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
                src="https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75"
                alt="DreamCar"
                style="
                    width:220px;
                    max-width:100%;
                    margin-bottom:24px;
                "
            />

            <h1 style="
                color:#ffffff;
                font-size:34px;
                margin:0;
                font-weight:700;
            ">
                Latest Competitions 
            </h1>

            <p style="
                color:#bdbdbd;
                margin-top:12px;
                font-size:15px;
                line-height:1.6;
            ">
                New luxury competitions added this week.
            </p>

        </div>

        <!-- BODY -->
        <div style="padding:40px 30px;">

            ${competitions.map(item => `

                <div style="
                    border:1px solid #eeeeee;
                    border-radius:14px;
                    padding:24px;
                    background:#fafafa;
                    margin-bottom:20px;
                ">

                    <h2 style="
                        margin:0 0 14px;
                        color:#111111;
                        font-size:22px;
                        line-height:1.4;
                    ">
                        ${item.title}
                    </h2>

                    <p style="
                        margin:0 0 10px;
                        color:#555555;
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
                        Enter now for your chance to win this premium competition before tickets sell out.
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

                <p style="
                    color:#666666;
                    font-size:14px;
                    line-height:1.7;
                    margin-bottom:22px;
                ">
                    More competitions are added every week.<br/>
                    Stay tuned for exclusive prizes and featured draws.
                </p>

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
                Good luck, <br/>
                <strong>DreamCar Competitions</strong>
            </p>

        </div>

    </div>

    `;
};
