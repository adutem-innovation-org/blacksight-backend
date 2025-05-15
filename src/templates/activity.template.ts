import { ActivityActionsEnum } from "@/enums";

export class ActivityTemplates {
  static userLoggedIn({
    firstName,
    lastName,
  }: {
    firstName: string;
    lastName: string;
  }) {
    return {
      title: "User logged in",
      description: `${firstName} ${lastName} just logged in`,
      action: ActivityActionsEnum.LOGIN,
    };
  }

  static userRegistered({
    firstName,
    lastName,
  }: {
    firstName: string;
    lastName: string;
  }) {
    return {
      title: "A new user just joined the platform",
      description: `${firstName} ${lastName} just signed up for a new account.`,
      action: ActivityActionsEnum.REGISTER,
    };
  }
}
