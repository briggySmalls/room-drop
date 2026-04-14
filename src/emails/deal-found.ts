interface DealEmailParams {
  hotelName: string;
  checkIn: string;
  checkOut: string;
  originalPrice: number;
  newPrice: number;
  currency: string;
  savingsAmount: number;
  savingsPercent: number;
  source: string;
  roomDescription: string;
  bookingLink: string | null;
  llmReasoning: string;
  cancellationDate: string;
  cancellationUrl: string | null;
  originalBookingSource: string | null;
  isRefundable: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildDealFoundEmail(params: DealEmailParams): {
  subject: string;
  html: string;
} {
  const subject = `Price drop: ${params.hotelName} — save ${params.currency} ${params.savingsAmount.toFixed(2)} (${params.savingsPercent.toFixed(1)}%)`;

  const nonRefundableWarning = !params.isRefundable
    ? `<tr>
        <td style="padding: 12px 16px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;">
          <strong style="color: #dc2626;">NON-REFUNDABLE</strong>
          <p style="margin: 4px 0 0; color: #991b1b; font-size: 14px;">
            This rate cannot be cancelled or refunded once booked.
          </p>
        </td>
      </tr>`
    : "";

  const bookingLinkSection = params.bookingLink
    ? `<tr>
        <td style="padding: 16px 0;">
          <a href="${params.bookingLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Book on ${params.source}
          </a>
        </td>
      </tr>`
    : "";

  const cancellationSection = `<tr>
      <td style="padding: 16px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;">
        <strong style="color: #92400e;">Cancel your original booking</strong>
        <p style="margin: 4px 0 0; font-size: 14px; color: #78350f;">
          Your free cancellation deadline${params.originalBookingSource ? ` with ${params.originalBookingSource}` : ""} is <strong>${formatDate(params.cancellationDate)}</strong>.
        </p>
        ${
          params.cancellationUrl
            ? `<p style="margin: 8px 0 0;">
            <a href="${params.cancellationUrl}" style="color: #92400e; font-weight: 600;">
              Cancel original booking
            </a>
          </p>`
            : ""
        }
      </td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <tr>
      <td style="padding-bottom: 8px;">
        <h1 style="margin: 0; font-size: 22px; color: #111827;">Price Drop Found</h1>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom: 16px;">
        <h2 style="margin: 0; font-size: 18px; color: #374151;">${params.hotelName}</h2>
        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">
          ${formatDate(params.checkIn)} — ${formatDate(params.checkOut)}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%">
              <span style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Your price</span>
              <p style="margin: 4px 0 0; font-size: 20px; color: #374151; text-decoration: line-through;">
                ${params.currency} ${params.originalPrice.toFixed(2)}
              </p>
            </td>
            <td width="50%">
              <span style="font-size: 12px; color: #6b7280; text-transform: uppercase;">New price</span>
              <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #059669;">
                ${params.currency} ${params.newPrice.toFixed(2)}
              </p>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 8px;">
              <span style="font-size: 16px; font-weight: 600; color: #059669;">
                Save ${params.currency} ${params.savingsAmount.toFixed(2)} (${params.savingsPercent.toFixed(1)}%)
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 0;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          <strong>Source:</strong> ${params.source}<br>
          <strong>Room:</strong> ${params.roomDescription}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 8px 0;">
        <p style="margin: 0; font-size: 14px; color: #6b7280; font-style: italic;">
          ${params.llmReasoning}
        </p>
      </td>
    </tr>
    ${nonRefundableWarning}
    ${bookingLinkSection}
    ${cancellationSection}
    <tr>
      <td style="padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Sent by RoomDrop
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
