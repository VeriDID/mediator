import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import { askarPostgresConfig } from "../../database";
import { AskarMultiWalletDatabaseScheme } from "@credo-ts/askar";
import { ConsoleLogger, InitConfig } from "@credo-ts/core";
import express from "express";
import { Server } from "ws";
import {
  ConnectionsModule,
  MediatorModule,
  HttpOutboundTransport,
  Agent,
  ConnectionInvitationMessage,
  LogLevel,
  WsOutboundTransport,
} from "@credo-ts/core";
import {
  HttpInboundTransport,
  agentDependencies,
  WsInboundTransport,
} from "@credo-ts/node";
import {
  PushNotificationsApnsModule,
  PushNotificationsFcmModule,
} from "@credo-ts/push-notifications";
import type { Socket } from "net";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.ADDRESS;
const port = process.env.PORT ? Number(process.env.PORT) : 3002;
console.log("Starting at " + url + ":" + port);
const app = express();
const socketServer = new Server({ noServer: true });
const httpOutboundTransport = new HttpOutboundTransport();
const wsInboundTransport = new WsInboundTransport({ server: socketServer });
const wsOutboundTransport = new WsOutboundTransport();
const httpInboundTransport = new HttpInboundTransport({ app, port });

export default class Service {
  private agent?: Agent;
  constructor() {}

  async startAgent(): Promise<Agent> {
    const logger = new ConsoleLogger(LogLevel.error);
    // Create PostgreSQL storage configuration
    const storageConfig = askarPostgresConfig();

    const agentConfig: InitConfig = {
      endpoints: [`https://${url}:${port}`, `wss://${url}:${port}`],
      label: process.env.AGENT_LABEL || "h",
      walletConfig: {
        id: process.env.WALLET_NAME || "h",
        key: process.env.WALLET_KEY || "h",
        storage: storageConfig,
      },
      logger,
    };

    const agent = new Agent({
      config: agentConfig,
      dependencies: agentDependencies,
      modules: {
        askar: new AskarModule({
          ariesAskar,
          multiWalletDatabaseScheme:
            AskarMultiWalletDatabaseScheme.ProfilePerWallet,
        }),
        // askar: new AskarModule({
        //   ariesAskar,
        // }),
        mediator: new MediatorModule({
          autoAcceptMediationRequests: true,
        }),
        connections: new ConnectionsModule({
          autoAcceptConnections: true,
        }),
        pushNotificationsFcm: new PushNotificationsFcmModule(),
        pushNotificationsApns: new PushNotificationsApnsModule(),
      },
    });

    agent.registerInboundTransport(httpInboundTransport);
    agent.registerOutboundTransport(httpOutboundTransport);
    agent.registerInboundTransport(wsInboundTransport);
    agent.registerOutboundTransport(wsOutboundTransport);

    httpInboundTransport.app.get("/invitation", async (req, res) => {
      if (typeof req.query.c_i === "string") {
        const invitation = ConnectionInvitationMessage.fromUrl(req.url);
        res.send(invitation.toJSON());
      } else {
        const { outOfBandInvitation } = await agent.oob.createInvitation();
        res.send(
          outOfBandInvitation.toUrl({
            domain: `https://${url}/invitation`,
          })
        );
      }
    });

    this.agent = agent;
    // console.log("Agent:", agent);
    return this.agent;
  }

  async logMediaitonInvitation() {
    const mediatorOutOfBandRecord = await this.agent?.oob.createInvitation({
      multiUseInvitation: true,
    });
    const mediatorInvitationUrl =
      mediatorOutOfBandRecord?.outOfBandInvitation.toUrl({
        domain: `https://${url}`,
      });

    console.log("Mediator invitation URL: ", mediatorInvitationUrl);
  }

  async handleSocketsUpgrade() {
    httpInboundTransport.server?.on("upgrade", (request, socket, head) => {
      socketServer.handleUpgrade(request, socket as Socket, head, (socket) => {
        socketServer.emit("connection", socket, request);
      });
    });
  }
}
