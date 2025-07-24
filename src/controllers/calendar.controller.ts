import { ConnectCalcomDto } from "@/decorators";
import { sendSuccessResponse } from "@/helpers";
import { GenericReq } from "@/interfaces";
import { CalendarService } from "@/services";
import { Request, Response } from "express";

export class CalendarController {
  private static instance: CalendarController;
  private readonly calendarService: CalendarService;

  constructor() {
    this.calendarService = CalendarService.getInstance();
  }

  static getInstance(): CalendarController {
    if (!this.instance) {
      this.instance = new CalendarController();
    }
    return this.instance;
  }

  getConnectedProviders = async (req: Request, res: Response) => {
    const data = await this.calendarService.getCalendarProviders(req.authData!);
    return sendSuccessResponse(res, data);
  };

  connectGoogle = async (req: Request, res: Response) => {
    const url = await this.calendarService.connectGoogle(req.authData!);
    return sendSuccessResponse(res, { url });
  };

  connectGoogleCallback = async (req: Request, res: Response) => {
    const { state: userId, code } = req.query;
    if (!userId || !code) {
      res.send(
        `  <script>
            window.opener.postMessage({provider: 'google-calendar', success: false}, '*');
            window.close()
        </script>`
      );
      return;
    }
    const data = await this.calendarService.connectGoogleCallback(
      userId.toString(),
      code.toString()
    );
    res.send(data);
  };

  disconnectGoogle = async (req: Request, res: Response) => {
    const data = await this.calendarService.disconnectGoogle(req.authData!);
    return sendSuccessResponse(res, data);
  };

  connectCalcom = async (req: GenericReq<ConnectCalcomDto>, res: Response) => {
    const data = await this.calendarService.connectCalcom(
      req.authData!,
      req.body
    );
    return sendSuccessResponse(res, data);
  };

  disconnectCalcom = async (req: Request, res: Response) => {
    const data = await this.calendarService.disconnectCalcom(req.authData!);
    return sendSuccessResponse(res, data);
  };
}
