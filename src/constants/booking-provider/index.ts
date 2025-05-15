import { MeetingProviders } from "@/enums";

export const bookingProviderUrlMapper: Record<MeetingProviders, string> = {
  zoom: "https://api.zoom.us/v2/zoom_events/events",
  meet: "https://api.meet.com",
};
