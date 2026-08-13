const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [2000, 10000];

const queue = [];
let isProcessing = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const HANDLERS = {
    "order-admin": (job) => sendOrderNotification({ to: job.to, order: job.order, type: "admin" }),
    "order-buyer": (job) => sendOrderNotification({ to: job.to, order: job.order, type: "buyer" }),
    "verify": (job) => sendVerificationEmail({ to: job.to, verifyUrl: job.verifyUrl }),
    "reset": (job) => sendResetPasswordEmail({ to: job.to, resetUrl: job.resetUrl })
};

const loadHandlers = () => {
    const { sendOrderNotification, sendVerificationEmail, sendResetPasswordEmail } = require("./mailer");
    HANDLERS["order-admin"] = (job) => sendOrderNotification({ to: job.to, order: job.order, type: "admin" });
    HANDLERS["order-buyer"] = (job) => sendOrderNotification({ to: job.to, order: job.order, type: "buyer" });
    HANDLERS["verify"] = (job) => sendVerificationEmail({ to: job.to, verifyUrl: job.verifyUrl });
    HANDLERS["reset"] = (job) => sendResetPasswordEmail({ to: job.to, resetUrl: job.resetUrl });
};

const processQueue = async () => {
    if (isProcessing) return;
    isProcessing = true;

    while (queue.length > 0) {
        const job = queue.shift();

        try {
            loadHandlers();
            const handler = HANDLERS[job.action];

            if (!handler) {
                throw new Error(`Aksi email tidak dikenal: ${job.action}`);
            }

            await handler(job);
            console.log(`[MAILQUEUE] Email terkirim ke ${job.to}`);
        } catch (error) {
            if (job.attempts < MAX_ATTEMPTS) {
                job.attempts += 1;
                const delay = RETRY_DELAYS[job.attempts - 2] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
                console.warn(`[MAILQUEUE] Gagal kirim ke ${job.to} (percobaan ${job.attempts}/${MAX_ATTEMPTS}), retry dalam ${delay / 1000}s:`, error.message);
                queue.push(job);
                await sleep(delay);
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