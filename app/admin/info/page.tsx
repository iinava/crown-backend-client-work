import { Card, CardContent } from "@/components/ui/card";
import {
  Video,
  LayoutDashboard,
  BedDouble,
  Users,
  CalendarDays,
  CreditCard,
  Utensils,
  Bell,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface Section {
  icon: typeof LayoutDashboard;
  title: string;
  summary: string;
  points: string[];
}

const sections: Section[] = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    summary: "Your daily home screen — a live snapshot of the hostel right now.",
    points: [
      "Shows a banner naming residents who haven't paid this month (or a green \"all collected\" banner if everyone has).",
      "Four stat tiles: Total Beds, Occupied, Vacant, and Unpaid (count for the current month).",
      "An overall occupancy bar, plus every room shown as a small card grouped by hostel and floor — red means full, green means partly occupied, grey means empty. Click a room to open it.",
      "This is a current-month snapshot only — it doesn't show history or trends.",
    ],
  },
  {
    icon: BedDouble,
    title: "Rooms & Beds",
    summary: "Where you set up the physical building: hostel → floor → room → bed.",
    points: [
      "Each room has a capacity and a type (regular, AC, or dormitory). A room is automatically marked \"full\" the moment every bed in it is occupied — you never set this by hand.",
      "Rent is not set on the room or bed — it's set per resident. Two people sharing a room can be charged different amounts.",
      "Assigning a bed to a resident is what actually checks them in. If that resident already had a different bed, the old one is freed automatically — so \"assign\" also works as \"move / transfer.\"",
      "Bed search matches by number — searching \"14\" will also find a bed like \"C3-14.\"",
    ],
  },
  {
    icon: Users,
    title: "Residents",
    summary: "The people who live in the hostel — their profile and lifecycle.",
    points: [
      "A resident profile holds name, phone, parent's phone, ID number, monthly/daily rate, move-in date, and notes.",
      "Blacklisting a resident only does one thing: it blocks them from being assigned a bed again. It doesn't restrict anything else.",
      "Checkout deactivates the resident and frees all their beds in one click — but it does NOT clear unpaid dues. Any outstanding rent or fine stays on record and simply stops growing as of the move-out date.",
      "Deleting a resident removes their profile and bed history, but their past payment records are kept for accounting.",
    ],
  },
  {
    icon: Users,
    title: "Staff",
    summary: "Hostel staff, tracked the same way as residents but excluded from billing.",
    points: [
      "A staff member is a resident record with the \"staff\" flag turned on.",
      "Staff can occupy a bed exactly like a resident, but they are automatically skipped when monthly rent is generated — no rent, no fines.",
    ],
  },
  {
    icon: CalendarDays,
    title: "Bookings",
    summary: "Reserve a bed in advance for someone who hasn't moved in yet.",
    points: [
      "A booking reserves a specific bed for a specific future month — it's the step before someone physically checks in.",
      "You can optionally take an advance payment while creating the booking. That amount is recorded as already paid, and gets automatically subtracted from that resident's real rent bill once it's generated for that month.",
      "The month picker here allows future months on purpose, since this whole page exists for future move-ins.",
    ],
  },
  {
    icon: CreditCard,
    title: "Payments",
    summary: "The financial core of the system — rent, advances, and fines.",
    points: [
      "\"Generate\" creates this month's rent bill for every active, non-staff resident who has a bed. Regular residents are charged their flat monthly rate, due on the 5th. Dormitory residents are charged per day stayed instead, with no due date and no fines. Clicking Generate again is always safe — it never duplicates or overwrites existing bills.",
      "\"Record Advance\" lets staff manually record a payment for any resident/month on the spot, separate from booking advances.",
      "Fines are calculated as: (days past the due date) × the daily fine rate set in Settings (₹50/day by default). Fines update automatically every day, or on demand via \"Recalculate.\" If a resident checks out, their fine stops growing as of their move-out date.",
      "The \"incl. ₹X fines\" link shows exactly which residents paid a late fee this month, when, and how much — a reporting view, not a payer-attribution field.",
      "Payments are simply paid or unpaid — there's no partial-payment status. The Payments page also includes a Profit & Loss summary: income collected vs. expenses vs. net profit for the selected month, plus a category breakdown of spending.",
    ],
  },
  {
    icon: Utensils,
    title: "Restaurant",
    summary: "Food-related expenses, tracked separately from general hostel expenses.",
    points: [
      "Food is the one expense category deliberately kept out of the main expenses view and shown here instead, so kitchen costs don't get mixed into general maintenance/utility spending.",
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    summary: "Automatic voice-call reminders for residents who haven't paid.",
    points: [
      "This is a phone call with a text-to-speech message — not an SMS or WhatsApp text.",
      "A background job runs repeatedly through the morning and, each time it runs, first refreshes every resident's fine amount. Then, if voice reminders are turned on in Settings, it calls a few overdue residents at a time (deliberately slow, to respect calling limits) reminding them of what they owe.",
      "Every call attempt — successful or failed — is logged here with a daily count.",
    ],
  },
  {
    icon: Settings,
    title: "Settings",
    summary: "Hostel-wide configuration.",
    points: [
      "Default Monthly Rate — pre-fills the rate field when adding a new resident.",
      "Daily Fine Amount — the ₹/day rate used in the fine formula above.",
      "Voice Reminders toggle — turns the automatic reminder calls on or off (fines keep updating either way).",
      "Grace Period (days) — currently has no effect on billing; the due date is always the 5th of the month regardless of this setting.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Admin Users",
    summary: "Who can log in and manage the hostel.",
    points: [
      "Login is a simple username and password — there are no permission levels. Every admin account can see and do everything.",
      "The one guardrail: the last remaining admin account can't be deleted, so you can never lock yourself out entirely.",
    ],
  },
];

export default function InfoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Info</h1>
        <p className="text-muted-foreground text-sm mt-1">
          A plain-language guide to every module in this admin panel, and what it actually does.
        </p>
      </div>

      <Card className="border shadow-sm bg-card">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
            <Video className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Demo Video</p>
            <p className="text-sm text-muted-foreground">
              Full walkthrough recording:{" "}
              <a
                href="https://drive.google.com/file/d/1vaWBwkbJjLi-48HFe8vGzipV2DmoXy1r/view?usp=sharing"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
              click here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="border shadow-sm bg-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{section.title}</p>
                    <p className="text-sm text-muted-foreground">{section.summary}</p>
                  </div>
                </div>
                <ul className="list-disc pl-[3.25rem] space-y-1.5">
                  {section.points.map((point, i) => (
                    <li key={i} className="text-sm text-foreground/90 leading-relaxed">
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
