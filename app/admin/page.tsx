"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import {
  FaArrowRight,
  FaArrowUpRightFromSquare,
  FaCalendarDays,
  FaCheck,
  FaClock,
  FaFilter,
  FaMagnifyingGlass,
  FaMoneyBillWave,
  FaPhone,
  FaRotate,
  FaWhatsapp,
} from "react-icons/fa6";
import Link from "next/link";

type Booking = {
  id: string;
  customer_name: string;
  mobile: string;
  email: string | null;
  location: string;
  service_type: string;
  preferred_date: string;
  notes: string | null;
  estimated_total: number;
  status: string;
  created_at: string;
};

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "received", label: "Received" },
  { value: "cleaning", label: "Cleaning" },
  { value: "quality_check", label: "Quality Check" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function normalizePhone(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

function displayStatus(status: string) {
  return status.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeStatus(status: string) {
  return status.toLowerCase().replace(/[\s-]+/g, "_");
}

function formatStatus(status: string) {
  const normalized = normalizeStatus(status);
  const labels: Record<string, string> = {
    new: "NEW",
    received: "RECEIVED",
    cleaning: "CLEANING",
    quality_check: "QUALITY CHECK",
    ready: "READY",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };
  return labels[normalized] ?? displayStatus(status || "unknown").toUpperCase();
}

function displayBookingId(id: string) {
  return `#${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function displayDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminEmail, setAdminEmail] = useState("sbkitkleen@gmail.com");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    ),
    []
  );

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      if (user.email) setAdminEmail(user.email);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setBookings(data || []);
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  const totalBookings = bookings.length;

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "new"
  ).length;

  const receivedBookings = bookings.filter(
    (booking) => booking.status === "received"
  ).length;

  const completedBookings = bookings.filter(
    (booking) => booking.status === "completed"
  ).length;

  const totalRevenue = bookings.reduce(
    (sum, booking) => sum + Number(booking.estimated_total || 0),
    0
  );

  const cleaningBookings = bookings.filter(
    (booking) => booking.status === "cleaning"
  ).length;

  const readyBookings = bookings.filter(
    (booking) => booking.status === "ready"
  ).length;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      !normalizedSearch ||
      [booking.customer_name, booking.mobile, booking.service_type]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesStatus =
      statusFilter === "all" || normalizeStatus(booking.status) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const metrics = [
    { label: "Total Bookings", value: totalBookings, note: "All requests", icon: FaCalendarDays, tone: "navy" },
    { label: "New", value: pendingBookings, note: "Awaiting review", icon: FaClock, tone: "lime" },
    { label: "Received", value: receivedBookings, note: "Gear checked in", icon: FaCheck, tone: "teal" },
    { label: "Cleaning", value: cleaningBookings, note: "In service", icon: FaRotate, tone: "blue" },
    { label: "Ready", value: readyBookings, note: "Ready for return", icon: FaArrowRight, tone: "green" },
    { label: "Completed", value: completedBookings, note: "Closed requests", icon: FaCheck, tone: "gray" },
    { label: "Booking Value", value: `₹${totalRevenue.toLocaleString("en-IN")}`, note: "Total requested value", icon: FaMoneyBillWave, tone: "value" },
  ];

  if (loading) {
    return (
      <main className="admin-page">
        <DashboardHeader email={adminEmail} onLogout={handleLogout}/>
        <div className="admin-loading-page">
          <div className="loading-panel" role="status" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <div>
              <strong>Loading booking operations...</strong>
              <span>Connecting to the KitKleen request queue</span>
            </div>
          </div>
        </div>
        <DashboardStyles />
      </main>
    );
  }

  return (
    <main className="admin-page">
      <DashboardHeader email={adminEmail} onLogout={handleLogout}/>

      <div className="admin-content">
        <section className="page-heading">
          <div>
            <span className="page-kicker">Operations overview</span>
            <h1>Booking Operations</h1>
            <p>Review incoming gear-care requests, track service progress and manage customer bookings.</p>
          </div>
          <div className="queue-indicator"><span /> Live booking queue</div>
        </section>

        {error && (
          <div className="error-panel" role="alert">
            <strong>Unable to load bookings right now.</strong>
            <span>{error}</span>
          </div>
        )}

        <section className="metrics-grid" aria-label="Booking metrics">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article className={`metric-card metric-${metric.tone}`} key={metric.label}>
                <div className="metric-topline">
                  <span>{metric.label}</span>
                  <span className="metric-icon"><Icon aria-hidden="true" /></span>
                </div>
                <strong className="metric-value">{metric.value}</strong>
                <span className="metric-note">{metric.note}</span>
              </article>
            );
          })}
        </section>

        <section className="bookings-panel">
          <div className="bookings-panel-header">
            <div className="bookings-heading">
              <span className="section-kicker">Customer requests</span>
              <h2>Recent Bookings</h2>
              <p>Customer requests received through the KitKleen website.</p>
            </div>
            <span className="booking-count"><strong>{filteredBookings.length}</strong> of {bookings.length} bookings</span>
          </div>

          <div className="booking-tools">
            <label className="search-control">
              <FaMagnifyingGlass aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, mobile or service..."
                aria-label="Search bookings"
              />
            </label>
            <label className="filter-control">
              <FaFilter aria-hidden="true" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter bookings by status">
                {statusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          {filteredBookings.length === 0 ? (
            bookings.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><FaCalendarDays aria-hidden="true" /></span>
                <h3>No bookings yet</h3>
                <p>New KitKleen customer requests will appear here.</p>
              </div>
            ) : (
              <div className="empty-state filtered-empty">
                <span className="empty-icon"><FaMagnifyingGlass aria-hidden="true" /></span>
                <h3>No matching bookings</h3>
                <p>Try another search or status filter.</p>
              </div>
            )
          ) : (
            <div className="table-scroll">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const phone = normalizePhone(booking.mobile);
                    return (
                      <tr key={booking.id}>
                        <td><span className="booking-id">{displayBookingId(booking.id)}</span></td>
                        <td>
                          <div className="customer-name">{booking.customer_name}</div>
                          <a className="customer-phone" href={`tel:+${phone}`}>{booking.mobile}<FaPhone aria-hidden="true" /></a>
                        </td>
                        <td>
                          <div className="service-name">{booking.service_type}</div>
                          <span className="service-location">{booking.location}</span>
                        </td>
                        <td><span className="date-cell">{displayDate(booking.preferred_date)}</span></td>
                        <td><strong className="amount-cell">₹{Number(booking.estimated_total).toLocaleString("en-IN")}</strong></td>
                        <td><StatusBadge status={booking.status} /></td>
                        <td>
                          <div className="row-actions">
                            <Link className="view-button" href={`/admin/bookings/${booking.id}`} aria-label={`View booking ${displayBookingId(booking.id)}`}>View <FaArrowUpRightFromSquare aria-hidden="true" /></Link>
                            {phone && <a className="whatsapp-button" href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" aria-label={`Message ${booking.customer_name} on WhatsApp`} title="Message on WhatsApp"><FaWhatsapp aria-hidden="true" /></a>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="panel-footer"><span>Booking data is synced from the KitKleen request queue.</span><span>{bookings.length} total records</span></div>
        </section>
        <footer className="admin-footer"><span>KitKleen Operations</span><span>Clean · Care · Restore</span></footer>
      </div>
      <DashboardStyles />
    </main>
  );
}

function DashboardHeader({email,onLogout}:{email:string;onLogout:()=>void}){
  return <header className="admin-header">
    <div className="admin-header-inner">
      <div className="admin-brand-block">
        <Image src="/kitkleen-logo.png" alt="KitKleen" width={48} height={48} className="admin-brand-logo" priority />
        <div className="admin-brand-copy">
          <span className="admin-brand-name">KIT<span>KLEEN</span></span>
          <span className="admin-brand-title">Admin Portal</span>
        </div>
      </div>
      <div className="admin-account">
        <span className="admin-account-email">{email}</span>
        <button className="logout-button" type="button" onClick={onLogout}>Logout</button>
      </div>
    </div>
  </header>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  return <span className={`status-badge status-${normalized || "unknown"}`}><i />{formatStatus(status)}</span>;
}

function DashboardStyles() {
  return (
    <style jsx global>{`
      .admin-page { min-height: 100vh; background: #F3F7F5; color: #17384B; font-family: "DM Sans", Arial, sans-serif; }
      .admin-header { background: #fff; border-bottom: 1px solid #D7E2DE; }
      .admin-header-inner { width: min(1380px, calc(100% - 56px)); min-height: 78px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
      .admin-brand-block { display: flex; align-items: center; gap: 11px; }
      .admin-brand-logo { width: 46px; height: 46px; object-fit: contain; }
      .admin-brand-copy { display: grid; gap: 4px; }
      .page-kicker, .section-kicker { color: #28757B; font-size: 9px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
      .admin-brand-name { font: 700 23px/.9 "Barlow Condensed", Impact, sans-serif; }
      .admin-brand-name span { color: #A9D83B; }
      .admin-brand-title { color: #28757B; font-size: 8px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
      .admin-account { display: flex; align-items: center; gap: 11px; }
      .admin-account-email { color: #5E7377; font-size: 11px; }
      .logout-button { padding: 8px 12px; border: 1px solid #D7E2DE; border-radius: 5px; background: #fff; color: #17384B; font-size: 10px; font-weight: 800; cursor: pointer; transition: background .18s, border-color .18s; }
      .logout-button:hover { border-color: #28757B; background: #F4F8F6; }
      .admin-content { width: min(1380px, calc(100% - 56px)); margin: 0 auto; padding: 31px 0 25px; }
      .page-heading { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: 22px; }
      .page-heading h1 { margin: 7px 0 6px; color: #17384B; font: 700 34px/.98 "Barlow Condensed", Impact, sans-serif; text-transform: uppercase; }
      .page-heading p { margin: 0; color: #63777A; font-size: 12px; line-height: 1.6; }
      .queue-indicator { display: inline-flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #D7E2DE; border-radius: 5px; background: #fff; color: #5E7377; font-size: 9px; white-space: nowrap; }
      .queue-indicator span { width: 7px; height: 7px; border-radius: 50%; background: #A9D83B; box-shadow: 0 0 0 3px #EFF6E1; }
      .error-panel { display: grid; gap: 4px; margin-bottom: 18px; padding: 13px 15px; border: 1px solid #E9C6BC; border-left: 3px solid #B45A45; border-radius: 5px; background: #FFF8F5; color: #7B3F31; }
      .error-panel strong { font-size: 12px; }
      .error-panel span { color: #94685E; font-size: 10px; overflow-wrap: anywhere; }
      .metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 11px; margin-bottom: 22px; }
      .metric-card { min-width: 0; padding: 14px 15px 13px; border: 1px solid #D7E2DE; border-radius: 7px; background: #fff; box-shadow: 0 3px 10px rgba(23,56,75,.025); }
      .metric-topline { display: flex; align-items: center; justify-content: space-between; gap: 9px; color: #718184; font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
      .metric-icon { width: 27px; height: 27px; display: grid; flex: 0 0 27px; place-items: center; border-radius: 5px; background: #EAF3F1; color: #28757B; font-size: 11px; }
      .metric-value { display: block; margin-top: 8px; color: #17384B; font: 700 29px/.95 "Barlow Condensed", Impact, sans-serif; }
      .metric-note { display: block; margin-top: 5px; color: #879491; font-size: 9px; }
      .metric-lime .metric-icon, .metric-green .metric-icon { background: #F1F7E5; color: #66882D; }
      .metric-blue .metric-icon { background: #EDF3F7; color: #57768A; }
      .metric-gray .metric-icon { background: #F0F3F2; color: #72817C; }
      .metric-value:has(+ .metric-note) { overflow-wrap: anywhere; }
      .metric-value { font-size: clamp(24px, 2vw, 29px); }
      .metric-value:where(:not(:empty)) { line-height: 1; }
      .metric-card:last-child .metric-value { font-size: clamp(21px, 1.8vw, 27px); }
      .bookings-panel { overflow: hidden; border: 1px solid #D7E2DE; border-radius: 8px; background: #fff; box-shadow: 0 5px 18px rgba(23,56,75,.035); }
      .bookings-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 19px 20px 16px; border-bottom: 1px solid #E6EDEA; }
      .bookings-heading h2 { margin: 5px 0 4px; color: #17384B; font: 700 25px/1 "Barlow Condensed", Impact, sans-serif; text-transform: uppercase; }
      .bookings-heading p { margin: 0; color: #74827F; font-size: 10px; }
      .booking-count { color: #82908C; font-size: 9px; white-space: nowrap; }
      .booking-count strong { color: #28757B; font-size: 12px; }
      .booking-tools { display: flex; gap: 9px; padding: 13px 20px; border-bottom: 1px solid #E6EDEA; background: #FCFDFC; }
      .search-control, .filter-control { height: 36px; display: flex; align-items: center; gap: 9px; padding: 0 10px; border: 1px solid #D7E2DE; border-radius: 4px; background: #fff; color: #73827E; }
      .search-control { flex: 1; }
      .search-control svg, .filter-control svg { flex: 0 0 auto; font-size: 11px; }
      .search-control input, .filter-control select { width: 100%; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: #17384B; font: 500 10px "DM Sans", Arial, sans-serif; }
      .search-control input::placeholder { color: #9AA8A4; }
      .search-control:focus-within, .filter-control:focus-within { border-color: #28757B; box-shadow: 0 0 0 3px rgba(40,117,123,.08); }
      .filter-control { width: 170px; }
      .filter-control select { appearance: none; cursor: pointer; }
      .table-scroll { width: 100%; overflow-x: auto; }
      .bookings-table { width: 100%; min-width: 940px; border-collapse: collapse; text-align: left; }
      .bookings-table th { padding: 11px 13px; background: #F6F9F7; color: #778580; font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
      .bookings-table th:first-child, .bookings-table td:first-child { padding-left: 20px; }
      .bookings-table td { padding: 12px 13px; border-top: 1px solid #EDF1EF; color: #52676C; font-size: 10px; vertical-align: middle; }
      .bookings-table tbody tr { transition: background .15s; }
      .bookings-table tbody tr:hover { background: #FAFCFB; }
      .booking-id { color: #28757B; font-size: 9px; font-weight: 900; letter-spacing: .04em; white-space: nowrap; }
      .customer-name, .service-name { max-width: 180px; overflow: hidden; color: #17384B; font-size: 10px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
      .customer-phone { display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; color: #71817D; font-size: 9px; white-space: nowrap; }
      .customer-phone svg { color: #8C9C95; font-size: 8px; }
      .customer-phone:hover { color: #28757B; }
      .service-location { display: block; max-width: 160px; margin-top: 4px; overflow: hidden; color: #87938F; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
      .date-cell { white-space: nowrap; }
      .amount-cell { color: #17384B; font: 700 18px "Barlow Condensed", Impact, sans-serif; white-space: nowrap; }
      .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px; border: 1px solid #DCE8DF; border-radius: 4px; background: #F3F7EF; color: #567631; font-size: 8px; font-weight: 800; white-space: nowrap; }
      .status-badge i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .status-new { border-color: #E9E3C8; background: #FBF8EB; color: #887635; }
      .status-received { border-color: #CFE2E0; background: #EEF7F5; color: #28757B; }
      .status-cleaning { border-color: #D3E1EA; background: #F0F5F8; color: #52758B; }
      .status-quality_check { border-color: #DBD8ED; background: #F5F3FA; color: #6B628E; }
      .status-ready { border-color: #D8E6BC; background: #F3F8E9; color: #64852E; }
      .status-completed { border-color: #D5E3DA; background: #F0F6F2; color: #54745F; }
      .status-cancelled { border-color: #E8D7D2; background: #FBF4F2; color: #976253; }
      .row-actions { display: flex; align-items: center; gap: 6px; }
      .view-button, .whatsapp-button { height: 27px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; border: 1px solid #D7E2DE; border-radius: 4px; background: #fff; color: #587078; font: 700 9px "DM Sans", Arial, sans-serif; white-space: nowrap; }
      .view-button { padding: 0 8px; cursor: pointer; transition: border-color .16s, background .16s, color .16s; }
      a.view-button { text-decoration: none; }
      .view-button:hover { border-color: #A9D83B; background: #F7FAF1; color: #28757B; }
      .view-button svg { font-size: 8px; }
      .whatsapp-button { width: 28px; color: #36765F; font-size: 12px; text-decoration: none; }
      .whatsapp-button:hover { border-color: #9ABFA7; background: #F2F8F1; }
      .admin-page .empty-state { display: grid; justify-items: center; padding: 42px 20px 45px; text-align: center; }
      .empty-icon { width: 42px; height: 42px; display: grid; place-items: center; margin-bottom: 12px; border: 1px solid #D7E2DE; border-radius: 8px; background: #F3F7F5; color: #28757B; font-size: 16px; }
      .empty-state h3 { margin: 0; color: #17384B; font: 700 22px "Barlow Condensed", Impact, sans-serif; text-transform: uppercase; }
      .empty-state p { margin: 5px 0 0; color: #71817D; font-size: 10px; }
      .admin-page .filtered-empty { padding-block: 30px; }
      .panel-footer { display: flex; justify-content: space-between; gap: 12px; padding: 10px 20px; border-top: 1px solid #E7EEEB; color: #92A09B; font-size: 8px; }
      .admin-footer { display: flex; justify-content: space-between; padding: 15px 1px; color: #8A9993; font-size: 9px; }
      .admin-loading-page { min-height: calc(100vh - 78px); display: grid; place-items: center; padding: 20px; }
      .loading-panel { display: flex; align-items: center; gap: 13px; padding: 18px 20px; border: 1px solid #D7E2DE; border-radius: 7px; background: #fff; box-shadow: 0 8px 26px rgba(23,56,75,.06); }
      .loading-panel div { display: grid; gap: 4px; }
      .loading-panel strong { color: #17384B; font-size: 12px; }
      .loading-panel div span { color: #81908B; font-size: 9px; }
      .loading-spinner { width: 23px; height: 23px; border: 2px solid #DCE9E3; border-top-color: #28757B; border-radius: 50%; animation: admin-spin .8s linear infinite; }
      @keyframes admin-spin { to { transform: rotate(360deg); } }
      @media (min-width: 1180px) { .metrics-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); } }
      @media (max-width: 820px) { .admin-header-inner, .admin-content { width: calc(100% - 36px); } .metrics-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .page-heading h1 { font-size: 31px; } }
      @media (max-width: 600px) { .admin-header-inner { min-height: 0; align-items: flex-start; flex-direction: column; gap: 12px; padding: 14px 0; } .admin-account { width: 100%; } .admin-account-email { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .admin-content { width: calc(100% - 28px); padding-top: 22px; } .page-heading { align-items: flex-start; flex-direction: column; gap: 10px; margin-bottom: 16px; } .page-heading h1 { font-size: 29px; } .page-heading p { max-width: 420px; font-size: 11px; } .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 15px; } .metric-card { padding: 11px; } .metric-topline { font-size: 7px; } .metric-icon { width: 24px; height: 24px; flex-basis: 24px; font-size: 10px; } .metric-value { margin-top: 7px; font-size: 25px; } .metric-card:last-child .metric-value { font-size: 22px; } .metric-note { font-size: 8px; } .bookings-panel-header { align-items: flex-start; padding: 15px 13px 12px; } .bookings-heading h2 { font-size: 23px; } .bookings-heading p { max-width: 245px; font-size: 9px; line-height: 1.5; } .booking-count { padding-top: 3px; font-size: 8px; } .booking-tools { flex-direction: column; padding: 11px 13px; } .search-control, .filter-control { width: 100%; height: 38px; } .bookings-table { min-width: 850px; } .bookings-table th:first-child, .bookings-table td:first-child { padding-left: 13px; } .bookings-table th, .bookings-table td { padding-inline: 10px; } .panel-footer { padding-inline: 13px; font-size: 7px; } .admin-footer { font-size: 8px; } }
      @media (prefers-reduced-motion: reduce) { .loading-spinner { animation-duration: 2s; } .admin-page, .admin-page *, .admin-page *::before, .admin-page *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; } }
    `}</style>
  );
}