export const AUTH = {
    emailInput: "auth-email-input",
    passwordInput: "auth-password-input",
    nameInput: "auth-name-input",
    submitBtn: "auth-submit-btn",
    toggleModeBtn: "auth-toggle-mode-btn",
    errorMsg: "auth-error-msg",
};

export const NAV = {
    sidebar: "app-sidebar",
    linkDashboard: "nav-dashboard",
    linkDevices: "nav-devices",
    linkTraffic: "nav-traffic",
    linkAlerts: "nav-alerts",
    linkTopology: "nav-topology",
    linkLogs: "nav-logs",
    linkUsers: "nav-users",
    linkAgents: "nav-agents",
    linkSettings: "nav-settings",
    logoutBtn: "nav-logout-btn",
    themeToggle: "nav-theme-toggle",
    langToggle: "nav-lang-toggle",
};

export const DASH = {
    kpiTotal: "kpi-total-devices",
    kpiOnline: "kpi-online",
    kpiOffline: "kpi-offline",
    kpiBandwidth: "kpi-bandwidth",
    kpiAlerts: "kpi-alerts",
    kpiUptime: "kpi-uptime",
    trafficChart: "traffic-chart",
    alertsList: "recent-alerts-list",
    activityList: "recent-activity-list",
};

export const DEVICES = {
    addBtn: "device-add-btn",
    table: "devices-table",
    row: (id) => `device-row-${id}`,
    editBtn: (id) => `device-edit-${id}`,
    deleteBtn: (id) => `device-delete-${id}`,
    dialogSubmit: "device-dialog-submit",
    dialogCancel: "device-dialog-cancel",
    searchInput: "device-search",
};

export const ALERTS = {
    list: "alerts-list",
    filter: (v) => `alerts-filter-${v}`,
    ackBtn: (id) => `alert-ack-${id}`,
    resolveBtn: (id) => `alert-resolve-${id}`,
};

export const USERS = {
    table: "users-table",
    roleSelect: (id) => `user-role-${id}`,
    deleteBtn: (id) => `user-delete-${id}`,
};

export const AGENTS = {
    addBtn: "agent-add-btn",
    downloadBtn: "agent-download-btn",
    list: "agents-list",
    keyCopy: (id) => `agent-key-copy-${id}`,
};

export const SETTINGS = {
    themeDark: "settings-theme-dark",
    themeLight: "settings-theme-light",
    langId: "settings-lang-id",
    langEn: "settings-lang-en",
    saveBtn: "settings-save-btn",
    nameInput: "settings-name-input",
};
