import dotenv from "dotenv";
dotenv.config();

import NotificationsService, {
  NotificationsHandler,
} from "./services/Notification/Service";
import Service from "./services/Agent/Service";

const notificationsHandler = new NotificationsHandler();
const pushService = new NotificationsService(new NotificationsHandler());
const agentService = new Service();

const run = async () => {
  const agent = await agentService.startAgent();
  await agent.initialize();
  await agentService.handleSocketsUpgrade();
  await pushService.setupPushNotificationsObserver(agent);
  await agentService.logMediaitonInvitation();
};

void run();

// Handle application termination
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

async function handleShutdown() {
  console.log("Shutting down...");
  try {
    await notificationsHandler.shutdown();
    console.log("NotificationsHandler shut down successfully");
  } catch (error) {
    console.error("Error during shutdown:", error);
  }
  process.exit(0);
}
