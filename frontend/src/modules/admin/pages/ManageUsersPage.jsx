import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminUserService from "../../../services/adminUser.service";

export default function ManageUsersPage() {
    const [users, setUsers] = useState([]);

    const [searchText, setSearchText] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await adminUserService.getAllUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
            setError("Cannot load users. Please check backend API.");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const getUserId = (user) => {
        return user.id || user.userId || user.userID;
    };

    const getFullName = (user) => {
        return user.fullName || user.name || user.userName || "Unknown User";
    };

    const getEmail = (user) => {
        return user.email || user.emailAddress || "No email";
    };

    const getRole = (user) => {
        return user.role || user.userRole || "USER";
    };

    const getStatus = (user) => {
        return user.status || user.accountStatus || "ACTIVE";
    };

    const getCreatedAt = (user) => {
        return user.createdAt || user.createdDate || user.registeredAt;
    };

    const formatDate = (value) => {
        if (!value) return "No date";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "No date";

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    };

    const getInitials = (name) => {
        if (!name) return "U";

        return name
            .split(" ")
            .map((item) => item[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    };

    const getRoleClass = (role) => {
        const value = String(role).toUpperCase();

        if (value === "ADMIN") {
            return "border-red-400/30 bg-red-400/10 text-red-300";
        }

        if (value === "EXPERT") {
            return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
        }

        if (value === "CLIENT") {
            return "border-green-400/30 bg-green-400/10 text-green-300";
        }

        return "border-gray-400/30 bg-gray-400/10 text-gray-300";
    };

    const getStatusClass = (status) => {
        const value = String(status).toUpperCase();

        if (value === "ACTIVE" || value === "VERIFIED") {
            return "border-green-400/30 bg-green-400/10 text-green-300";
        }

        if (value === "PENDING") {
            return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
        }

        if (value === "BANNED" || value === "SUSPENDED" || value === "LOCKED") {
            return "border-red-400/30 bg-red-400/10 text-red-300";
        }

        return "border-gray-400/30 bg-gray-400/10 text-gray-300";
    };

    const filteredUsers = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();

        return users.filter((user) => {
            const name = getFullName(user).toLowerCase();
            const email = getEmail(user).toLowerCase();
            const role = String(getRole(user)).toUpperCase();
            const status = String(getStatus(user)).toUpperCase();

            const matchSearch =
                !keyword || name.includes(keyword) || email.includes(keyword);

            const matchRole =
                roleFilter === "ALL" || role === roleFilter.toUpperCase();

            const matchStatus =
                statusFilter === "ALL" || status === statusFilter.toUpperCase();

            return matchSearch && matchRole && matchStatus;
        });
    }, [users, searchText, roleFilter, statusFilter]);

    const handleUpdateStatus = async (userId, status) => {
        const confirmUpdate = window.confirm(
            `Are you sure you want to change this user status to ${status}?`
        );

        if (!confirmUpdate) return;

        try {
            setActionLoadingId(userId);
            setMessage("");
            setError("");

            await adminUserService.updateUserStatus(userId, status);

            setMessage("User status updated successfully.");
            await loadUsers();
        } catch (err) {
            console.error(err);
            setError("Cannot update user status. Please check backend API.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleUpdateRole = async (userId, role) => {
        const confirmUpdate = window.confirm(
            `Are you sure you want to change this user role to ${role}?`
        );

        if (!confirmUpdate) return;

        try {
            setActionLoadingId(userId);
            setMessage("");
            setError("");

            await adminUserService.updateUserRole(userId, role);

            setMessage("User role updated successfully.");
            await loadUsers();
        } catch (err) {
            console.error(err);
            setError("Cannot update user role. Please check backend API.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const cardStyle =
        "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

    const labelStyle =
        "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

    return (
        <AdminLayout>
            <div className="px-5 py-10 md:px-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                                Admin Users
                            </p>

                            <h1 className="text-3xl font-bold text-white md:text-4xl">
                                Manage users
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                                View clients, experts, admins, account roles and account
                                statuses.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadUsers}
                            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                        >
                            Refresh
                        </button>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
                            {message}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {/* Filter */}
                    <section className={`${cardStyle} mb-6 p-6`}>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_180px_180px_150px]">
                            <div>
                                <label className={labelStyle}>Search User</label>

                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                                        search
                                    </span>

                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={(event) => setSearchText(event.target.value)}
                                        placeholder="Search by name or email..."
                                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelStyle}>Role</label>

                                <select
                                    value={roleFilter}
                                    onChange={(event) => setRoleFilter(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                                >
                                    <option value="ALL">All roles</option>
                                    <option value="CLIENT">Client</option>
                                    <option value="EXPERT">Expert</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelStyle}>Status</label>

                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                                >
                                    <option value="ALL">All status</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="BANNED">Banned</option>
                                    <option value="SUSPENDED">Suspended</option>
                                </select>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                                <p className="text-xs uppercase tracking-wider text-gray-500">
                                    Total
                                </p>

                                <p className="mt-1 text-2xl font-bold text-white">
                                    {filteredUsers.length}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Loading */}
                    {loading && (
                        <div className={`${cardStyle} p-12 text-center text-gray-400`}>
                            <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                                hourglass_empty
                            </span>
                            Loading users...
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && filteredUsers.length === 0 && (
                        <div className={`${cardStyle} p-12 text-center`}>
                            <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                                groups
                            </span>

                            <h2 className="text-xl font-bold text-white">No users found</h2>

                            <p className="mt-2 text-sm text-gray-400">
                                There are no users that match your filter.
                            </p>
                        </div>
                    )}

                    {/* User list */}
                    {!loading && filteredUsers.length > 0 && (
                        <div className="grid grid-cols-1 gap-5">
                            {filteredUsers.map((user) => {
                                const userId = getUserId(user);
                                const role = getRole(user);
                                const status = getStatus(user);

                                return (
                                    <article
                                        key={userId}
                                        className={`${cardStyle} p-6 transition hover:border-cyan-400/40`}
                                    >
                                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="flex flex-1 gap-4">
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-lg font-bold text-cyan-300">
                                                    {getInitials(getFullName(user))}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getRoleClass(
                                                                role
                                                            )}`}
                                                        >
                                                            {role}
                                                        </span>

                                                        <span
                                                            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                                                status
                                                            )}`}
                                                        >
                                                            {status}
                                                        </span>

                                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                                            Joined {formatDate(getCreatedAt(user))}
                                                        </span>
                                                    </div>

                                                    <h2 className="truncate text-xl font-bold text-white">
                                                        {getFullName(user)}
                                                    </h2>

                                                    <p className="mt-1 truncate text-sm text-gray-400">
                                                        {getEmail(user)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-96">
                                                <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">
                                                    Admin Actions
                                                </p>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={actionLoadingId === userId}
                                                        onClick={() =>
                                                            handleUpdateStatus(userId, "ACTIVE")
                                                        }
                                                        className="rounded-lg border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:opacity-50"
                                                    >
                                                        Active
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={actionLoadingId === userId}
                                                        onClick={() =>
                                                            handleUpdateStatus(userId, "SUSPENDED")
                                                        }
                                                        className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:opacity-50"
                                                    >
                                                        Suspend
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={actionLoadingId === userId}
                                                        onClick={() => handleUpdateStatus(userId, "BANNED")}
                                                        className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:opacity-50"
                                                    >
                                                        Ban
                                                    </button>

                                                    <select
                                                        disabled={actionLoadingId === userId}
                                                        value={role}
                                                        onChange={(event) =>
                                                            handleUpdateRole(userId, event.target.value)
                                                        }
                                                        className="rounded-lg border border-white/10 bg-[#151a22] px-3 py-2 text-sm font-semibold text-gray-300 outline-none transition focus:border-[#00F0FF] disabled:opacity-50"
                                                    >
                                                        <option value="CLIENT">Client</option>
                                                        <option value="EXPERT">Expert</option>
                                                        <option value="ADMIN">Admin</option>
                                                    </select>
                                                </div>

                                                {actionLoadingId === userId && (
                                                    <p className="mt-3 text-xs text-gray-500">
                                                        Updating user...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}