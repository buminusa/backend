const nodemailer = require("nodemailer");
const { enqueueEmailJob } = require("./emailQueue");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const formatIDR = (value) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(Number(value) || 0);
};

const formatDate = (date) => {
    return new Date(date).toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

const STATUS_COLORS = {
    PENDING: { bg: "#fef3c7", text: "#92400e" },
    PROCESSING: { bg: "#dbeafe", text: "#1e40af" },
    CONFIRMED: { bg: "#dbeafe", text: "#1e40af" },
    SHIPPED: { bg: "#e0e7ff", text: "#3730a3" },
    COMPLETED: { bg: "#d1fae5", text: "#065f46" },
    CANCELLED: { bg: "#fee2e2", text: "#991b1b" },
    DEFAULT: { bg: "#f3f4f6", text: "#374151" }
};

const getStatusBadge = (status) => {
    const key = (status || "").toUpperCase();
    const color = STATUS_COLORS[key] || STATUS_COLORS.DEFAULT;
    return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;background:${color.bg};color:${color.text};white-space:nowrap;">${status || "-"}</span>`;
};

// row helper -- pakai <table> bukan flex, biar aman di semua email client
const infoRow = (label, value, bold = false) => `
    <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f3f2;font-size:13px;color:#6b7280;vertical-align:top;width:40%;">${label}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f3f2;font-size:${bold ? "15px" : "13px"};color:${bold ? "#047857" : "#111827"};${bold ? "font-weight:800;" : "font-weight:500;"}text-align:right;vertical-align:top;">${value}</td>
    </tr>
`;

const buildOrderEmailHtml = (order, type) => {
    const isAdmin = type === "admin";

    const buyer = order.buyer || {};
    const supplier = order.supplier || {};

    const itemsHtml = (order.orderItems || [])
        .map((item, idx) => {
            const product = item.product || {};
            const priceRange =
                product.price_min && product.price_max
                    ? `${formatIDR(product.price_min)} - ${formatIDR(product.price_max)}`
                    : "-";
            const rowBg = idx % 2 === 0 ? "#ffffff" : "#fafcfb";

            // stacked layout per item: nama di atas, qty & harga di baris bawah -> lebih enak dibaca di layar sempit
            return `
                <tr style="background:${rowBg};">
                    <td colspan="2" style="padding:14px 12px 4px;border-top:1px solid #eef2f1;">
                        <div style="font-weight:700;color:#111827;font-size:13.5px;">${product.nama || "-"}</div>
                    </td>
                </tr>
                <tr style="background:${rowBg};">
                    <td style="padding:0 12px 14px;font-size:12.5px;color:#6b7280;">${item.quantity} ${product.unit || ""}</td>
                    <td style="padding:0 12px 14px;text-align:right;font-size:13px;color:#059669;font-weight:700;">${priceRange}</td>
                </tr>
            `;
        })
        .join("");

    const buyerBlock = isAdmin
        ? `
        <tr>
            <td style="padding-top:20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #eef2f1;">
                    <tr>
                        <td style="padding:16px;">
                            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:#059669;font-weight:700;margin-bottom:8px;">Buyer</div>
                            <div style="font-size:14px;color:#111827;font-weight:700;">${buyer.full_name || "-"}</div>
                            <div style="font-size:12.5px;color:#6b7280;margin-top:2px;">${buyer.phone || "-"} &middot; ${buyer.province || "-"}, ${buyer.country || "-"}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>`
        : "";

    return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${order.order_number || "Pesanan"}</title>
<style>
    body { margin:0; padding:0; background:#eef2f1; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    img { border:0; display:block; }
    @media only screen and (max-width:600px) {
        .email-wrapper { width:100% !important; padding:0 !important; }
        .email-card { border-radius:0 !important; }
        .header-pad { padding:28px 20px 40px !important; }
        .body-pad { padding:20px 20px 24px !important; }
        .order-badge-pad { padding:0 20px !important; margin-top:-20px !important; }
        .title-text { font-size:19px !important; }
        table.items-table th, table.items-table td { padding-left:10px !important; padding-right:10px !important; }
    }
</style>
</head>
<body>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f1;">
        <tr>
            <td align="center" style="padding:24px 12px;">
                <table role="presentation" class="email-wrapper" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
                    <tr>
                        <td class="email-card" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(16,185,129,0.08);">

                            <!-- Header -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="header-pad" style="background:#065f46;background:linear-gradient(135deg,#065f46,#10b981);padding:36px 32px 48px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width:44px;height:44px;background:rgba(255,255,255,0.15);border-radius:12px;font-size:20px;text-align:center;vertical-align:middle;">
                                                    ${isAdmin ? "🔔" : "📦"}
                                                </td>
                                            </tr>
                                        </table>
                                        <div class="title-text" style="font-size:21px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;margin-top:14px;">${isAdmin ? "Pesanan Baru Masuk" : "Detail Pesanan Anda"}</div>
                                        <div style="font-size:13px;color:#d1fae5;margin-top:5px;">${isAdmin ? "Ada order baru yang perlu diproses" : "Terima kasih telah berbelanja di Bumi Nusa"}</div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Order number floating badge -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="order-badge-pad" style="padding:0 32px;margin-top:-22px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="background:#ffffff;border:1px solid #a7f3d0;color:#047857;font-size:13px;font-weight:800;padding:10px 18px;border-radius:12px;box-shadow:0 4px 12px rgba(16,185,129,0.15);white-space:nowrap;">
                                                    #${order.order_number || "-"}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Body -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="body-pad" style="padding:24px 32px 32px;">

                                        <!-- Info summary -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:10px 0;border-bottom:1px solid #f0f3f2;font-size:13px;color:#6b7280;width:40%;">Status</td>
                                                <td style="padding:10px 0;border-bottom:1px solid #f0f3f2;text-align:right;">${getStatusBadge(order.status)}</td>
                                            </tr>
                                            ${infoRow("Tanggal", formatDate(order.createdAt))}
                                            ${infoRow("Supplier", supplier.company_name || "-")}
                                        </table>

                                        <!-- Items -->
                                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#059669;font-weight:700;margin:26px 0 10px;">🛒 Item Pesanan</div>
                                        <table role="presentation" class="items-table" width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #eef2f1;">
                                            ${itemsHtml || "<tr><td style='padding:16px 12px;color:#9ca3af;text-align:center;font-size:13px;'>Tidak ada item</td></tr>"}
                                        </table>

                                        <!-- Buyer (admin only) -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            ${buyerBlock}
                                        </table>

                                        <!-- Total & shipping -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background:#f0fdf4;border-radius:14px;border:1px solid #d1fae5;">
                                            <tr>
                                                <td style="padding:14px 18px 4px;">
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                        ${infoRow("Alamat Pengiriman", order.shipping_address || "-")}
                                                        ${order.notes ? infoRow("Catatan", order.notes) : ""}
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Footer -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #f0f3f2;">
                                            <tr>
                                                <td style="padding-top:20px;text-align:center;">
                                                    <div style="font-size:13px;font-weight:700;color:#047857;margin-bottom:4px;">BumiNusa.id</div>
                                                    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                                                        Email ini dikirim otomatis oleh sistem BumiNusa.id<br>
                                                        Mohon tidak membalas email ini.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};

const sendOrderNotification = async ({ to, order, type }) => {
    const subject =
        type === "admin"
            ? `Pesanan Baru Masuk - ${order.order_number}`
            : `Detail Pesanan Anda - ${order.order_number}`;

    const info = await transporter.sendMail({
        from: `"Bumi Nusa" <${process.env.MAIL_FROM}>`,
        to,
        subject,
        html: buildOrderEmailHtml(order, type)
    });

    return info;
};

const buildActionEmailHtml = ({ title, subtitle, message, buttonText, buttonUrl, expiryNote }) => `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${title}</title>
<style>
    body { margin:0; padding:0; background:#eef2f1; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    img { border:0; display:block; }
    @media only screen and (max-width:600px) {
        .email-wrapper { width:100% !important; padding:0 !important; }
        .email-card { border-radius:0 !important; }
        .header-pad { padding:28px 20px !important; }
        .body-pad { padding:24px 20px !important; }
        .title-text { font-size:19px !important; }
        .cta-btn { width:100% !important; display:block !important; }
    }
</style>
</head>
<body>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f1;">
        <tr>
            <td align="center" style="padding:24px 12px;">
                <table role="presentation" class="email-wrapper" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
                    <tr>
                        <td class="email-card" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(16,185,129,0.08);">

                            <!-- Header -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="header-pad" style="background:#065f46;background:linear-gradient(135deg,#065f46,#10b981);padding:36px 32px;">
                                        <div class="title-text" style="font-size:21px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">${title}</div>
                                        <div style="font-size:13px;color:#d1fae5;margin-top:5px;">Notifikasi otomatis &middot; BumiNusa.id</div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Body -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="body-pad" style="padding:28px 32px 32px;">
                                        <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">${message}</p>

                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="padding:8px 0 20px;">
                                                    <table role="presentation" class="cta-btn" cellpadding="0" cellspacing="0" style="width:280px;max-width:100%;">
                                                        <tr>
                                                            <td align="center" style="background:#10b981;border-radius:12px;">
                                                                <a href="${buttonUrl}" style="display:inline-block;padding:14px 0;width:100%;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">${buttonText}</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="margin:0 0 16px;font-size:12px;color:#6b7280;text-align:center;line-height:1.6;">
                                            Link berlaku ${expiryNote}. Jika tombol tidak berfungsi,<br>salin dan buka link berikut di browser:
                                        </p>
                                        <p style="margin:0 0 24px;font-size:12px;color:#059669;text-align:center;word-break:break-all;line-height:1.6;">${buttonUrl}</p>

                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f3f2;">
                                            <tr>
                                                <td style="padding-top:20px;text-align:center;">
                                                    <div style="font-size:13px;font-weight:700;color:#047857;margin-bottom:4px;">BumiNusa.id</div>
                                                    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                                                        Email ini dikirim otomatis oleh sistem BumiNusa.id<br>
                                                        Mohon tidak membalas email ini.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const sendVerificationEmail = async ({ to, verifyUrl }) => {
    const info = await transporter.sendMail({
        from: `"Bumi Nusa" <${process.env.MAIL_FROM}>`,
        to,
        subject: "Verifikasi Email Anda - BumiNusa.id",
        html: buildActionEmailHtml({
            title: "Verifikasi Email Anda",
            subtitle: "Notifikasi otomatis · BumiNusa.id",
            message:
                "Halo, terima kasih telah mendaftar di Bumi Nusa. Untuk mengaktifkan akun Anda, silakan verifikasi alamat email dengan menekan tombol di bawah ini.",
            buttonText: "Verifikasi Email",
            buttonUrl: verifyUrl,
            expiryNote: "24 jam"
        })
    });

    return info;
};

const sendResetPasswordEmail = async ({ to, resetUrl }) => {
    const info = await transporter.sendMail({
        from: `"Bumi Nusa" <${process.env.MAIL_FROM}>`,
        to,
        subject: "Reset Password Anda - BumiNusa.id",
        html: buildActionEmailHtml({
            title: "Reset Password Anda",
            subtitle: "Notifikasi otomatis · BumiNusa.id",
            message:
                "Kami menerima permintaan untuk mereset password akun Anda. Silakan tekan tombol di bawah ini untuk membuat password baru. Jika Anda tidak meminta reset ini, abaikan email ini.",
            buttonText: "Reset Password",
            buttonUrl: resetUrl,
            expiryNote: "30 menit"
        })
    });

    return info;
};

const queueOrderEmails = (order, buyerEmail) => {
    enqueueEmailJob({ action: "order-admin", to: process.env.ADMIN_EMAIL, order });
    enqueueEmailJob({ action: "order-buyer", to: buyerEmail, order });
};

const queueVerificationEmail = (to, verifyUrl) => {
    enqueueEmailJob({ action: "verify", to, verifyUrl });
};

const queueResetPasswordEmail = (to, resetUrl) => {
    enqueueEmailJob({ action: "reset", to, resetUrl });
};

module.exports = {
    transporter,
    sendOrderNotification,
    sendVerificationEmail,
    sendResetPasswordEmail,
    queueOrderEmails,
    queueVerificationEmail,
    queueResetPasswordEmail
};