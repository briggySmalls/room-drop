"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { bookingSchema, type BookingFormValues } from "@/lib/schemas/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { currencies } from "@/lib/currencies";

const toNumber = (v: string) => (v === "" ? undefined : Number(v));
const toNullableNumber = (v: string) => (v === "" ? null : Number(v));

const STEPS = ["Your Booking", "Booking Reference", "Alert Settings"] as const;

const STEP_1_FIELDS = [
  "hotel_name",
  "check_in_date",
  "check_out_date",
  "room_type",
  "current_price",
  "cancellation_date",
] as const;

export default function NewBooking() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [thresholdMode, setThresholdMode] = useState<"percentage" | "absolute">(
    "percentage",
  );

  const [currency, setCurrency] = useState("GBP");
  const [roomSpecific, setRoomSpecific] = useState(true);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      currency: "GBP",
      num_guests: 2,
      non_refundable_window_days: 3,
      threshold_percent: 10,
      room_specific: true,
    },
  });

  async function nextStep() {
    if (step === 0) {
      const fieldsToValidate = roomSpecific
        ? [...STEP_1_FIELDS]
        : STEP_1_FIELDS.filter((f) => f !== "room_type");
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;

      const checkIn = getValues("check_in_date");
      const checkOut = getValues("check_out_date");
      if (checkOut && checkIn && checkOut <= checkIn) {
        setError("check_out_date", {
          message: "Check-out date must be after check-in date",
        });
        return;
      }
    }
    setStep(step + 1);
  }

  function prevStep() {
    setStep(step - 1);
  }

  function switchThresholdMode(mode: "percentage" | "absolute") {
    if (mode === thresholdMode) return;
    setThresholdMode(mode);
    if (mode === "percentage") {
      setValue("threshold_absolute", null);
    } else {
      setValue("threshold_percent", null);
    }
  }

  async function onSubmit(data: BookingFormValues) {
    setServerError(null);

    const body = {
      ...data,
      hotel_location: data.hotel_location || null,
      cancellation_url: data.cancellation_url || null,
      original_booking_source: data.original_booking_source || null,
      original_confirmation: data.original_confirmation || null,
      cancellation_date: `${data.cancellation_date}T23:59:00Z`,
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const responseData = await res.json();
      setServerError(
        responseData.errors?.join(", ") ||
          responseData.error ||
          "Something went wrong",
      );
      return;
    }

    router.push("/");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Add Booking</h1>

      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of 3 &mdash; {STEPS[step]}
        </p>
        <div className="mt-2 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 0 && (
          <>
            <Field data-invalid={errors.hotel_name ? true : undefined}>
              <FieldLabel htmlFor="hotel_name">Hotel Name</FieldLabel>
              <Input id="hotel_name" {...register("hotel_name")} />
              {errors.hotel_name && (
                <FieldError>{errors.hotel_name.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="hotel_location">Location</FieldLabel>
              <Input id="hotel_location" {...register("hotel_location")} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={errors.check_in_date ? true : undefined}>
                <FieldLabel htmlFor="check_in_date">Check-in Date</FieldLabel>
                <Input
                  id="check_in_date"
                  type="date"
                  {...register("check_in_date")}
                />
                {errors.check_in_date && (
                  <FieldError>{errors.check_in_date.message}</FieldError>
                )}
              </Field>
              <Field data-invalid={errors.check_out_date ? true : undefined}>
                <FieldLabel htmlFor="check_out_date">Check-out Date</FieldLabel>
                <Input
                  id="check_out_date"
                  type="date"
                  {...register("check_out_date")}
                />
                {errors.check_out_date && (
                  <FieldError>{errors.check_out_date.message}</FieldError>
                )}
              </Field>
            </div>

            <Field orientation="horizontal">
              <Checkbox
                id="room_specific"
                checked={roomSpecific}
                onCheckedChange={(checked) => {
                  const value = Boolean(checked);
                  setRoomSpecific(value);
                  setValue("room_specific", value);
                  if (!value) {
                    setValue("room_type", null);
                  }
                }}
              />
              <FieldContent>
                <FieldLabel htmlFor="room_specific">
                  Match specific room type
                </FieldLabel>
                <FieldDescription>
                  {roomSpecific
                    ? "Only rates with a known room type will be compared"
                    : "All rates considered regardless of room type — more results, but you may be alerted about a different room"}
                </FieldDescription>
              </FieldContent>
            </Field>

            {roomSpecific && (
              <Field data-invalid={errors.room_type ? true : undefined}>
                <FieldLabel htmlFor="room_type">Room Type</FieldLabel>
                <Input id="room_type" {...register("room_type")} />
                {errors.room_type && (
                  <FieldError>{errors.room_type.message}</FieldError>
                )}
              </Field>
            )}

            <div className="grid grid-cols-3 gap-4">
              <Field data-invalid={errors.num_guests ? true : undefined}>
                <FieldLabel htmlFor="num_guests">Number of Guests</FieldLabel>
                <Input
                  id="num_guests"
                  type="number"
                  {...register("num_guests", { setValueAs: toNumber })}
                />
                {errors.num_guests && (
                  <FieldError>{errors.num_guests.message}</FieldError>
                )}
              </Field>
              <Field data-invalid={errors.current_price ? true : undefined}>
                <FieldLabel htmlFor="current_price">Total Price</FieldLabel>
                <Input
                  id="current_price"
                  type="number"
                  step="0.01"
                  {...register("current_price", { setValueAs: toNumber })}
                />
                {errors.current_price && (
                  <FieldError>{errors.current_price.message}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel>Currency</FieldLabel>
                <Combobox
                  value={currency}
                  onValueChange={(value) => {
                    const code = (value as string) ?? "GBP";
                    setCurrency(code);
                    setValue("currency", code);
                  }}
                  items={currencies.map((c) => c.code)}
                  filter={(code: string, query: string) => {
                    const c = currencies.find((cur) => cur.code === code);
                    if (!c) return false;
                    const q = query.toLowerCase();
                    return (
                      c.code.toLowerCase().includes(q) ||
                      c.name.toLowerCase().includes(q)
                    );
                  }}
                  autoHighlight
                >
                  <ComboboxInput placeholder="Search currencies..." />
                  <ComboboxContent>
                    <ComboboxList>
                      <ComboboxCollection>
                        {(code: string) => {
                          const c = currencies.find(
                            (cur) => cur.code === code,
                          );
                          return (
                            <ComboboxItem key={code} value={code}>
                              {code} &mdash; {c?.name}
                            </ComboboxItem>
                          );
                        }}
                      </ComboboxCollection>
                      <ComboboxEmpty>No currencies found</ComboboxEmpty>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
            </div>

            <Field data-invalid={errors.cancellation_date ? true : undefined}>
              <FieldLabel htmlFor="cancellation_date">
                Free Cancellation Date
              </FieldLabel>
              <Input
                id="cancellation_date"
                type="date"
                {...register("cancellation_date")}
              />
              {errors.cancellation_date && (
                <FieldError>{errors.cancellation_date.message}</FieldError>
              )}
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted-foreground">
              Optional &mdash; included in alert emails so you can act quickly
              on deals
            </p>

            <Field>
              <FieldLabel htmlFor="cancellation_url">
                Cancellation URL
              </FieldLabel>
              <Input
                id="cancellation_url"
                type="url"
                {...register("cancellation_url")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="original_booking_source">
                Booking Source
              </FieldLabel>
              <Input
                id="original_booking_source"
                {...register("original_booking_source")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="original_confirmation">
                Confirmation Number
              </FieldLabel>
              <Input
                id="original_confirmation"
                {...register("original_confirmation")}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field>
              <FieldLabel>Deal Threshold</FieldLabel>
              <FieldDescription>
                Minimum price drop before we send you an alert
              </FieldDescription>
              <Tabs
                value={thresholdMode}
                onValueChange={(value) =>
                  switchThresholdMode(value as "percentage" | "absolute")
                }
              >
                <TabsList className="mb-3">
                  <TabsTrigger value="percentage">Percentage</TabsTrigger>
                  <TabsTrigger value="absolute">Absolute</TabsTrigger>
                </TabsList>
                <TabsContent value="percentage">
                  <Field>
                    <FieldLabel htmlFor="threshold_percent">
                      Min Price Drop %
                    </FieldLabel>
                    <Input
                      id="threshold_percent"
                      type="number"
                      step="0.01"
                      {...register("threshold_percent", {
                        setValueAs: toNullableNumber,
                      })}
                    />
                  </Field>
                </TabsContent>
                <TabsContent value="absolute">
                  <Field
                    data-invalid={errors.threshold_absolute ? true : undefined}
                  >
                    <FieldLabel htmlFor="threshold_absolute">
                      Min Price Drop (absolute)
                    </FieldLabel>
                    <Input
                      id="threshold_absolute"
                      type="number"
                      step="0.01"
                      {...register("threshold_absolute", {
                        setValueAs: toNullableNumber,
                      })}
                    />
                    {errors.threshold_absolute && (
                      <FieldError>
                        {errors.threshold_absolute.message}
                      </FieldError>
                    )}
                  </Field>
                </TabsContent>
              </Tabs>
              {errors.threshold_percent && (
                <FieldError>{errors.threshold_percent.message}</FieldError>
              )}
            </Field>

            <Field
              data-invalid={
                errors.non_refundable_window_days ? true : undefined
              }
            >
              <FieldLabel htmlFor="non_refundable_window_days">
                Non-refundable window
              </FieldLabel>
              <FieldDescription>
                Include non-refundable rates this many days before your
                cancellation deadline
              </FieldDescription>
              <Input
                id="non_refundable_window_days"
                type="number"
                {...register("non_refundable_window_days", {
                  setValueAs: toNumber,
                })}
              />
              {errors.non_refundable_window_days && (
                <FieldError>
                  {errors.non_refundable_window_days.message}
                </FieldError>
              )}
            </Field>
          </>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              key="next"
              type="button"
              onClick={nextStep}
              className="flex-1"
            >
              Next
            </Button>
          ) : (
            <Button
              key="submit"
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Saving..." : "Add Booking"}
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
