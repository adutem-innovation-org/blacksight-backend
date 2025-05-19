import { sendSuccessResponse } from "@/helpers";
import { MeetingProviderService } from "@/services";
import { Request, Response } from "express";

export class MeetingProviderController {
  private static instance: MeetingProviderController;
  private readonly meetingProviderService: MeetingProviderService;

  constructor() {
    this.meetingProviderService = MeetingProviderService.getInstance();
  }

  static getInstance(): MeetingProviderController {
    if (!this.instance) {
      this.instance = new MeetingProviderController();
    }
    return this.instance;
  }

  getConnectedProviders = async (req: Request, res: Response) => {
    const data = await this.meetingProviderService.getMeetingProviders(
      req.authData!
    );
    return sendSuccessResponse(res, data);
  };

  connectGoogle = async (req: Request, res: Response) => {
    const url = await this.meetingProviderService.connectGoogle(req.authData!);
    return sendSuccessResponse(res, { url });
  };

  connectGoogleCallback = async (req: Request, res: Response) => {
    const { state: userId, code } = req.query;
    if (!userId || !code) {
      res.send(
        `  <script>
            window.opener.postMessage({provider: 'google-meet', success: false}, '*');
            window.close()
        </script>`
      );
      return;
    }
    const data = await this.meetingProviderService.connectGoogleCallback(
      userId.toString(),
      code.toString()
    );
    res.send(data);
  };

  disconnectGoogle = async (req: Request, res: Response) => {
    const data = await this.meetingProviderService.disconnectGoogle(
      req.authData!
    );
    return sendSuccessResponse(res, data);
  };
}
