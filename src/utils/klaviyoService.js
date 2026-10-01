const axios = require("axios");
const prisma = require("../prismaconfig");
const Loggers = require("./Logger");

const KLAVIYO_REVISION = "2024-10-15";
const KLAVIYO_API_BASE = "https://a.klaviyo.com/api";

const getHeaders = () => {
    const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
    if (!apiKey) {
        Loggers.warn("KLAVIYO_PRIVATE_API_KEY is not defined in environment.");
    }
    return {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        accept: "application/json",
        "content-type": "application/json",
        revision: KLAVIYO_REVISION
    };
};

/**
 * Normalizes phone numbers to international E.164 standard (e.g. +447700900123)
 */
const normalizePhoneE164 = (phone) => {
    if (!phone) return null;
    let clean = phone.trim().replace(/[\-\s()]/g, "");
    if (!clean) return null;

    if (clean.startsWith("+")) {
        return clean;
    }

    if (clean.startsWith("00")) {
        return `+${clean.slice(2)}`;
    }

    // Default UK national format (e.g. 07123456789 -> +447123456789)
    if (clean.startsWith("0")) {
        return `+44${clean.slice(1)}`;
    }

    // If starts with 44 and 12 digits
    if (clean.startsWith("44")) {
        return `+${clean}`;
    }

    return `+${clean}`;
};

/**
 * Splits full name into first and last name safely
 */
const parseName = (fullName) => {
    let firstName = "";
    let lastName = "";
    if (fullName && typeof fullName === "string" && fullName.trim()) {
        const parts = fullName.trim().split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
    }
    return { firstName, lastName };
};

/**
 * Standardized competition object schema required by client document
 */
const formatCompetitionFields = (competition) => {
    if (!competition) return {};

    const frontendUrl = (process.env.FRONTEND_URL || "https://dreamcarcompetitions.com").replace(/\/$/, "");
    const slugOrId = competition.slug || competition.id;
    const url = `${frontendUrl}/competition/${slugOrId}`;

    let imageUrl = "";
    if (Array.isArray(competition.images) && competition.images.length > 0) {
        imageUrl = competition.images[0];
    } else if (competition.detailImage) {
        imageUrl = competition.detailImage;
    }

    const ticketPrice = Number(competition.ticketPrice || 0);
    const totalTickets = Number(competition.totalTickets || 0);
    const soldTickets = Number(competition.soldTickets || 0);
    const soldPct = totalTickets > 0 ? Number(((soldTickets / totalTickets) * 100).toFixed(1)) : 0;

    return {
        competition_id: Number(competition.id),
        competition_name: competition.title || "",
        url,
        image_url: imageUrl,
        ticket_price: ticketPrice,
        category: competition.productType || "car_bike",
        closes_at: competition.endTime ? new Date(competition.endTime).toISOString() : null,
        draw_at: competition.endTime ? new Date(competition.endTime).toISOString() : null,
        tickets_sold_pct: soldPct
    };
};

/**
 * Track server-side Klaviyo Event via Klaviyo Events API
 * Automatically handles deduplication via unique_id
 */
const trackEvent = async ({
    metricName,
    profile,
    properties = {},
    uniqueId = null,
    value = null,
    time = null
}) => {
    try {
        const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
        if (!apiKey) {
            Loggers.warn(`Skipping Klaviyo event [${metricName}]: KLAVIYO_PRIVATE_API_KEY missing`);
            return false;
        }

        if (!profile || !profile.email) {
            Loggers.warn(`Skipping Klaviyo event [${metricName}]: profile email missing`);
            return false;
        }

        const email = profile.email.trim().toLowerCase();
        const externalId = profile.external_id || profile.member_number ? String(profile.external_id || profile.member_number) : undefined;
        const normalizedPhone = profile.phone ? normalizePhoneE164(profile.phone) : undefined;

        const profileAttributes = {
            email
        };

        if (externalId) {
            profileAttributes.external_id = externalId;
        }

        if (normalizedPhone) {
            profileAttributes.phone_number = normalizedPhone;
        }

        if (profile.first_name) {
            profileAttributes.first_name = profile.first_name;
        }

        if (profile.last_name) {
            profileAttributes.last_name = profile.last_name;
        }

        const eventAttributes = {
            properties: {
                ...properties
            },
            metric: {
                data: {
                    type: "metric",
                    attributes: {
                        name: metricName
                    }
                }
            },
            profile: {
                data: {
                    type: "profile",
                    attributes: profileAttributes
                }
            },
            time: time ? new Date(time).toISOString() : new Date().toISOString()
        };

        if (uniqueId) {
            eventAttributes.unique_id = String(uniqueId);
        }

        if (value !== null && value !== undefined && !isNaN(Number(value))) {
            eventAttributes.value = Number(value);
        }

        const payload = {
            data: {
                type: "event",
                attributes: eventAttributes
            }
        };

        const response = await axios.post(`${KLAVIYO_API_BASE}/events/`, payload, {
            headers: getHeaders()
        });

        Loggers.info(`Klaviyo event [${metricName}] tracked successfully for ${email}. UniqueId: ${uniqueId || "N/A"}`);
        return true;
    } catch (error) {
        const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        Loggers.error(`Klaviyo event [${metricName}] failed: ${errorDetail}`);
        return false;
    }
};

/**
 * Calculates lifetime statistics for a user and updates Klaviyo profile properties
 */
const updateProfileProperties = async (userOrId) => {
    try {
        const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
        if (!apiKey) return false;

        let user = null;
        if (typeof userOrId === "object" && userOrId !== null && userOrId.id) {
            user = userOrId;
        } else if (userOrId) {
            user = await prisma.user.findUnique({
                where: { id: parseInt(userOrId, 10) }
            });
        }

        if (!user || !user.email) return false;

        const userId = user.id;
        const { firstName, lastName } = parseName(user.name);
        const phone = normalizePhoneE164(user.phone);

        // Calculate lifetime user metrics from database
        const successfulPayments = await prisma.stripePayment.findMany({
            where: {
                userId,
                status: "success"
            },
            orderBy: { createdAt: "asc" }
        });

        const totalOrders = successfulPayments.length;
        const totalSpent = Number(successfulPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toFixed(2));
        const firstPurchaseDate = totalOrders > 0 && successfulPayments[0].createdAt ? new Date(successfulPayments[0].createdAt).toISOString() : null;
        const lastPurchaseDate = totalOrders > 0 && successfulPayments[totalOrders - 1].createdAt ? new Date(successfulPayments[totalOrders - 1].createdAt).toISOString() : null;

        const totalTicketsCount = await prisma.ticket.count({
            where: { userId }
        });

        const distinctCompetitions = await prisma.ticket.findMany({
            where: { userId },
            select: { competitionId: true },
            distinct: ["competitionId"]
        });
        const competitionsEnteredCount = distinctCompetitions.length;

        const profileAttributes = {
            email: user.email.trim().toLowerCase(),
            external_id: String(user.memberNumber || user.id),
            first_name: firstName,
            last_name: lastName,
            properties: {
                member_number: user.memberNumber || user.id,
                first_name: firstName,
                last_name: lastName,
                account_created_at: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
                country: "United Kingdom",
                total_orders: totalOrders,
                total_tickets_purchased: totalTicketsCount,
                total_spent: totalSpent,
                competitions_entered_count: competitionsEnteredCount,
                first_purchase_date: firstPurchaseDate,
                last_purchase_date: lastPurchaseDate
            }
        };

        if (phone) {
            profileAttributes.phone_number = phone;
            profileAttributes.properties.phone_number = phone;
        }

        // Upsert Profile
        await axios.post(
            `${KLAVIYO_API_BASE}/profile-import/`,
            {
                data: {
                    type: "profile",
                    attributes: profileAttributes
                }
            },
            { headers: getHeaders() }
        );

        Loggers.info(`Klaviyo profile properties synced for member #${user.memberNumber} (${user.email})`);
        return true;
    } catch (error) {
        const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        Loggers.error(`Klaviyo updateProfileProperties failed: ${errorDetail}`);
        return false;
    }
};

/**
 * Subscribes a profile to a Klaviyo list with Email & SMS channels
 */
const subscribeProfile = async ({
    email,
    name = "",
    phone = null,
    memberNumber = null,
    emailConsent = true,
    smsConsent = false,
    listId = null,
    source = "Website"
}) => {
    try {
        const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
        const targetListId = listId || process.env.WEBSITE_NEWSLETTER_KLAVIYO_LIST_ID;

        if (!apiKey) return false;
        if (!email) return false;

        const cleanEmail = email.trim().toLowerCase();
        const { firstName, lastName } = parseName(name);
        const normalizedPhone = normalizePhoneE164(phone);

        // 1. Upsert Profile
        const profileAttributes = {
            email: cleanEmail,
            first_name: firstName,
            last_name: lastName,
            properties: {
                signup_source: source
            }
        };

        if (memberNumber) {
            profileAttributes.external_id = String(memberNumber);
            profileAttributes.properties.member_number = memberNumber;
        }

        if (normalizedPhone) {
            profileAttributes.phone_number = normalizedPhone;
            profileAttributes.properties.phone = normalizedPhone;
        }

        await axios.post(
            `${KLAVIYO_API_BASE}/profile-import/`,
            {
                data: {
                    type: "profile",
                    attributes: profileAttributes
                }
            },
            { headers: getHeaders() }
        );

        // 2. Subscribe to List if listId provided (Email and SMS decoupled for resilience)
        if (targetListId) {
            // 2a. Subscribe Email if consent given
            if (emailConsent) {
                try {
                    const emailProfileAttrs = {
                        email: cleanEmail,
                        subscriptions: {
                            email: {
                                marketing: {
                                    consent: "SUBSCRIBED"
                                }
                            }
                        }
                    };
                    if (memberNumber) {
                        emailProfileAttrs.external_id = String(memberNumber);
                    }

                    await axios.post(
                        `${KLAVIYO_API_BASE}/profile-subscription-bulk-create-jobs`,
                        {
                            data: {
                                type: "profile-subscription-bulk-create-job",
                                attributes: {
                                    custom_source: source,
                                    profiles: {
                                        data: [
                                            {
                                                type: "profile",
                                                attributes: emailProfileAttrs
                                            }
                                        ]
                                    }
                                },
                                relationships: {
                                    list: {
                                        data: {
                                            type: "list",
                                            id: targetListId
                                        }
                                    }
                                }
                            }
                        },
                        { headers: getHeaders() }
                    );
                    Loggers.info(`Klaviyo Email subscription succeeded for ${cleanEmail}`);
                } catch (emailErr) {
                    const errDetail = emailErr.response?.data ? JSON.stringify(emailErr.response.data) : emailErr.message;
                    Loggers.error(`Klaviyo Email subscription failed for ${cleanEmail}: ${errDetail}`);
                }
            }

            // 2b. Subscribe SMS if consent given and phone number available
            if (smsConsent && normalizedPhone) {
                try {
                    const smsProfileAttrs = {
                        email: cleanEmail,
                        phone_number: normalizedPhone,
                        subscriptions: {
                            sms: {
                                marketing: {
                                    consent: "SUBSCRIBED"
                                }
                            }
                        }
                    };
                    if (memberNumber) {
                        smsProfileAttrs.external_id = String(memberNumber);
                    }

                    await axios.post(
                        `${KLAVIYO_API_BASE}/profile-subscription-bulk-create-jobs`,
                        {
                            data: {
                                type: "profile-subscription-bulk-create-job",
                                attributes: {
                                    custom_source: source,
                                    profiles: {
                                        data: [
                                            {
                                                type: "profile",
                                                attributes: smsProfileAttrs
                                            }
                                        ]
                                    }
                                },
                                relationships: {
                                    list: {
                                        data: {
                                            type: "list",
                                            id: targetListId
                                        }
                                    }
                                }
                            }
                        },
                        { headers: getHeaders() }
                    );
                    Loggers.info(`Klaviyo SMS subscription succeeded for ${cleanEmail} (${normalizedPhone})`);
                } catch (smsErr) {
                    const errDetail = smsErr.response?.data ? JSON.stringify(smsErr.response.data) : smsErr.message;
                    Loggers.warn(`Klaviyo SMS subscription skipped or pending SMS number configuration: ${errDetail}`);
                }
            }
        }

        return true;
    } catch (error) {
        const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        Loggers.error(`Klaviyo subscribeProfile failed: ${errorDetail}`);
        return false;
    }
};

module.exports = {
    normalizePhoneE164,
    parseName,
    formatCompetitionFields,
    trackEvent,
    updateProfileProperties,
    subscribeProfile
};
