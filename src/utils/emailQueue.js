const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 3000];

const queue = [];
let isProcessing = false;

let mailer = null;
const getMailer = () => {
    if (!mailer) {
        mailer = require("./mailer");
    }
    return mailer;
};

const HANDLERS = {
    "order-admin": (job) => getMailer().sendOrderNotification({ to: job.to, order: job.order, type: "admin" }),
    "order-buyer": (job) => getMailer().sendOrderNotification({ to: job.to, order: job.order, type: "buyer" }),
    "verify": (job) => getMailer().sendVerificationEmail({ to: job.to, verifyUrl: job.verifyUrl }),
    "reset": (job) => getMailer().sendResetPasswordEmail({ to: job.to, resetUrl: job.resetUrl })
};

const processQueue = async () => {
    if (isProcessing) return;
    isProcessing = true;

    while (queue.length > 0) {
        const job = queue.shift();

        try {
            const handler = HANDLERS[job.action];

            if (!handler) {
                throw new Error(`Aksi email tidak dikenal: ${job.action}`);
            }

            await handler(job);
            console.log(`[MAILQUEUE] Email terkirim ke ${job.to}`);
        } catch (error) {
            if (job.attempts < MAX_ATTEMPTS - 1) {
                job.attempts += 1;
                const delay = RETRY_DELAYS[job.attempts - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
                console.warn(`[MAILQUEUE] Gagal kirim ke ${job.to} (percobaan ${job.attempts + 1}/${MAX_ATTEMPTS}), retry dalam ${delay / 1000}s:`, error.message);

                setTimeout(() => {
                    queue.push(job);
                    processQueue();
                }, delay);
            } else {
                console.error(`[MAILQUEUE] Gagal kirim permanen ke ${job.to}:`, error.message || error);
            }
        }
    }

    isProcessing = false;
};

const enqueueEmailJob = (job) => {
    queue.push({ ...job, attempts: 0 });
    processQueue();
};

module.exports = {
    enqueueEmailJob
};