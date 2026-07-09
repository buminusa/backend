// status flow order
const STATUS_FLOW = {
    Pending: ["Confirmed", "Cancelled"],
    Confirmed: ["Processing", "Cancelled"],
    Processing: ["Shipped"],
    Shipped: ["Completed"],
    Completed: [],
    Cancelled: []
};

const ROLE_ALLOWED_TRANSITIONS = {
    Buyer: {
        Pending: ["Cancelled"]
    },
    Supplier: {
        Pending: ["Confirmed", "Cancelled"],
        Confirmed: ["Processing", "Cancelled"],
        Processing: ["Shipped"]
    },
    Admin: STATUS_FLOW
};

module.exports = {
    STATUS_FLOW,
    ROLE_ALLOWED_TRANSITIONS
};