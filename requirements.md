### Hotel Price Hacker: MVP Requirements (MoSCoW)

| Epic              | Requirement               | User Story                                                                                                                                                     | Priority    |
| :---------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- |
| **1. Onboarding** | Booking Ingestion         | As a user, I want to input my current hotel booking details (Hotel Name, Dates, Price, Room Type, Free Cancellation Date) so the system knows what to monitor. | Must Have   |
| **1. Onboarding** | Deal Thresholds           | As a user, I want to set a minimum price drop percentage or absolute value so I don't get alerted for insignificant savings.                                   | Must Have   |
| **1. Onboarding** | Advanced Room Preferences | As a user, I want a toggle to indicate if I am willing to accept a lower-tier room downgrade for a massive price drop.                                         | Could Have  |
| **2. Monitoring** | Continuous Checking       | As the system, I need to check aggregated market prices for the specific hotel/dates at regular intervals to catch price drops.                                | Must Have   |
| **2. Monitoring** | Refundable Check          | As the system, if the user is far from their cancellation date, I must only compare their price against other free cancellation rates.                         | Must Have   |
| **2. Monitoring** | Intelligent Matching      | As the system, I must use an LLM to evaluate cheaper scraped rooms against the original room so I do not alert users to a worse room.                          | Must Have   |
| **2. Monitoring** | Timeline Shift            | As the system, when close to the cancellation cutoff (e.g., 3 days prior), I should start including non-refundable rates to snag last-minute fire-sale prices. | Should Have |
| **3. Alerts**     | Email Notification        | As a user, I want to receive an immediate email notification when a valid deal is found that meets my thresholds and room requirements.                        | Must Have   |
| **3. Alerts**     | Actionable Handoff        | As a user, I want the email alert to contain a direct link to the new booking and a clear reminder of when/how to cancel my original booking.                  | Must Have   |
| **3. Alerts**     | Expiry & Cleanup          | As the system, I need to automatically stop tracking a booking once the user's cancellation cutoff date has passed to save compute resources.                  | Must Have   |
| **3. Alerts**     | SMS Notification          | As a user, I want the option to receive an immediate SMS text notification when a valid deal is found.                                                         | Could Have  |
