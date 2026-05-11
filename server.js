const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const Telnyx = require("telnyx");

const app = express();

app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);
const telnyx = Telnyx(process.env.TELNYX_API_KEY);

app.get("/", (req, res) => {
  res.send("Server is running");
});

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

    const smsBody = `URGENT ELECTRICAL REQUEST

Name: ${customer_name || "Not provided"}
Phone: ${phone_number || "Not provided"}
Address: ${service_address || "Not provided"}
Service Needed: ${service_needed || "Not provided"}
Issue: ${issue_summary || "Not provided"}

The customer was told a supervisor or technician will call shortly to confirm the message was received and go over next steps.

Please call the customer ASAP.`;

    // Send email
    await resend.emails.send({
      from: "Zap Tech Electrical <onboarding@resend.dev>",
      to: process.env.OFFICE_EMAIL,
      subject: emailSubject,
      text: emailBody
    });

    console.log("Email sent successfully");

    // Send Telnyx text message only if high priority
    if (isHighPriority) {
      await telnyx.messages.create({
        from: process.env.TELNYX_FROM_NUMBER,
        to: process.env.OFFICE_PHONE_NUMBER,
        text: smsBody
      });

      console.log("High priority Telnyx text message sent successfully");
    } else {
      console.log("Normal priority request - SMS not sent");
    }

    res.json({
      success: true,
      message: isHighPriority
        ? "High priority appointment email and Telnyx text sent successfully"
        : "Appointment email sent successfully"
    });
  } catch (error) {
    console.error("Function error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send appointment email or Telnyx text",
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
