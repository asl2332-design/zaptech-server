const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
// Telnyx temporarily disabled while using Microsoft Teams
// const Telnyx = require("telnyx");

const app = express();

app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);
// const telnyx = Telnyx(process.env.TELNYX_API_KEY);

app.get("/", (req, res) => {
  res.send("Server is running");
});

async function sendTeamsAlert(data, isHighPriority) {
  if (!process.env.TEAMS_WEBHOOK_URL) {
    console.log("No TEAMS_WEBHOOK_URL set - Teams alert skipped");
    return;
  }

  const teamsMessage = {
    title: isHighPriority
      ? "🚨 URGENT Electrical Service Call"
      : "New Service Request",

    customer_name: data.customer_name || "Not provided",
    phone_number: data.phone_number || "Not provided",
    email: data.email || "Not provided",

    service_address: data.service_address || "Not provided",
    property_type: data.property_type || "Not provided",
    service_needed: data.service_needed || "Not provided",
    issue_summary: data.issue_summary || "Not provided",

    preferred_date: data.preferred_date || "Not provided",
    preferred_time_window: data.preferred_time_window || "Not provided",
    confirmation_method: data.confirmation_method || "Not provided",

    call_type: data.call_type || "Not provided",
    priority: "HIGH",

    urgent_safety_concern: data.urgent_safety_concern || "Unknown",
    immediate_danger: data.immediate_danger || "Unknown",
    additional_notes: data.additional_notes || "None"
  };

  const response = await fetch(process.env.TEAMS_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(teamsMessage)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Teams webhook failed:", response.status, errorText);
  } else {
    console.log("Emergency Teams alert sent successfully");
  }
}

app.post("/send-appointment", async (req, res) => {
  console.log("DATA RECEIVED:", JSON.stringify(req.body, null, 2));

  try {
    const data = req.body.args || req.body;

    const {
      call_type = "",
      priority = "Normal",
      customer_name = "",
      phone_number = "",
      email = "",
      service_address = "",
      property_type = "",
      service_needed = "",
      issue_summary = "",
      preferred_date = "",
      preferred_time_window = "",
      confirmation_method = "",
      original_appointment_date = "",
      requested_new_date = "",
      reason_for_change_or_cancel = "",
      project_type = "",
      project_timeline = "",
      plans_or_drawings_available = "",
      photos_available = "",
      urgent_safety_concern = "",
      immediate_danger = "",
      additional_notes = ""
    } = data;

    const emergencyText = `
${priority}
${urgent_safety_concern}
${immediate_danger}
${service_needed}
${issue_summary}
${additional_notes}
`.toLowerCase();

    const emergencyWords = [
      "burning",
      "burn",
      "spark",
      "sparking",
      "smoke",
      "fire",
      "hot",
      "turning black",
      "black outlet",
      "crackling",
      "buzzing",
      "exposed wire",
      "exposed wires",
      "melting",
      "electrical smell",
      "emergency",
      "danger",
      "urgent"
    ];

    const isHighPriority =
      priority.toLowerCase() === "high" ||
      urgent_safety_concern.toLowerCase() === "yes" ||
      immediate_danger.toLowerCase() === "yes" ||
      emergencyWords.some((word) => emergencyText.includes(word));

    const emailSubject = isHighPriority
      ? "URGENT Electrical Request - Zap Tech Electrical"
      : "New Appointment Request - Zap Tech Electrical";

    const emailBody = `
New appointment request received.

Call Type: ${call_type || "Not provided"}
Priority: ${isHighPriority ? "HIGH" : priority || "Normal"}

Customer Information:
Name: ${customer_name || "Not provided"}
Phone: ${phone_number || "Not provided"}
Email: ${email || "Not provided"}

Service Information:
Service Address: ${service_address || "Not provided"}
Property Type: ${property_type || "Not provided"}
Service Needed: ${service_needed || "Not provided"}
Issue Summary: ${issue_summary || "Not provided"}

Preferred Appointment:
Preferred Date: ${preferred_date || "Not provided"}
Preferred Time Window: ${preferred_time_window || "Not provided"}
Confirmation Method: ${confirmation_method || "Not provided"}

Appointment Change Info:
Original Appointment Date: ${original_appointment_date || "Not applicable"}
Requested New Date: ${requested_new_date || "Not applicable"}
Reason for Change/Cancel: ${reason_for_change_or_cancel || "Not applicable"}

Project Info:
Project Type: ${project_type || "Not applicable"}
Project Timeline: ${project_timeline || "Not applicable"}
Plans or Drawings Available: ${plans_or_drawings_available || "Not provided"}
Photos Available: ${photos_available || "Not provided"}

Safety Info:
Urgent Safety Concern: ${urgent_safety_concern || "Unknown"}
Immediate Danger: ${immediate_danger || "Unknown"}

Additional Notes:
${additional_notes || "None"}
`;

    // Send email for every request
    await resend.emails.send({
      from: "Zap Tech Electrical <onboarding@resend.dev>",
      to: process.env.OFFICE_EMAIL,
      subject: emailSubject,
      text: emailBody
    });

    console.log("Email sent successfully");

    // Send Microsoft Teams alert only for emergency/high-priority calls
    if (isHighPriority) {
      await sendTeamsAlert(data, isHighPriority);
    } else {
      console.log("Normal priority request - Teams alert not sent");
    }

    // Telnyx SMS temporarily disabled while using Teams
    if (isHighPriority) {
      console.log("Telnyx SMS temporarily disabled - using Teams for emergency alerts");
    } else {
      console.log("Normal priority request - SMS not sent");
    }

    res.json({
      success: true,
      message: isHighPriority
        ? "High priority appointment email and Teams alert sent successfully"
        : "Normal appointment email sent successfully"
    });
  } catch (error) {
    console.error("Function error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send appointment email or Teams alert",
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
