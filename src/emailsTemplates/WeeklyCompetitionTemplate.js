module.exports = ({
    competitions = []
}) => {

    return `

    <div style="
        font-family: Arial, sans-serif;
        max-width: 650px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid #f0f0f0;
        box-shadow: 0 4px 30px rgba(0,0,0,0.06);
    ">

        <div style="
            background: #000;
            padding: 40px 30px;
            text-align: center;
        ">

            <img 
                src="${process.env.LIVE_URL}/img/logoDC.png"
                alt="DreamCar"
                style="
                    width: 220px;
                    max-width: 100%;
                    margin-bottom: 20px;
                "
            />

            <h1 style="
                color: #fff;
                margin: 0;
                font-size: 30px;
                font-weight: 700;
            ">
                Latest Competitions 🔥
            </h1>

            <p style="
                color: rgba(255,255,255,0.7);
                margin-top: 12px;
                font-size: 15px;
            ">
                New luxury competitions added this week.
            </p>

        </div>

        <div style="padding:40px 30px;">

            ${competitions.map(item => `

                <div style="
                    background: #fafafa;
                    border-radius: 16px;
                    overflow: hidden;
                    margin-bottom: 24px;
                    border: 1px solid #eee;
                ">

                    <img
                        src="${item.images?.[0]}"
                        alt="${item.title}"
                        style="
                            width:100%;
                            max-height:260px;
                            display:block;
                            object-fit:cover;
                        "
                    />

                    <div style="padding:24px;">

                        <h2 style="
                            margin:0 0 12px;
                            color:#111;
                            font-size:22px;
                        ">
                            ${item.title}
                        </h2>

                        <p style="
                            color:#666;
                            font-size:15px;
                            line-height:1.7;
                        ">
                            Ticket Price:
                            <strong>£${item.ticketPrice}</strong>
                        </p>

                        <a
                            href="${process.env.FRONTEND_URL}/competition/${item.slug}"
                            style="
                                display:inline-block;
                                margin-top:16px;
                                background:#EC6623;
                                color:#fff;
                                padding:12px 20px;
                                border-radius:8px;
                                text-decoration:none;
                                font-weight:bold;
                            "
                        >
                            Enter Competition
                        </a>

                    </div>

                </div>

            `).join("")}

        </div>

        <div style="
            border-top: 1px solid #eee;
            padding: 28px;
            text-align: center;
            background: #fafafa;
        ">
            <p style="
                margin: 0;
                color: #888;
                font-size: 14px;
            ">
                Good luck 🍀<br/>
                <strong>DreamCar Competitions</strong>
            </p>
        </div>

    </div>

    `;
};