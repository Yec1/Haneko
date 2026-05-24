import { Client, Collection, GatewayIntentBits } from "discord.js";
import { ClusterClient, getInfo } from "discord-hybrid-sharding";
import { CustomDatabase } from "../utils/Database.js";
import { NHentaiService } from "../services/NHentaiService.js";
import { Logger } from "../utils/Logger.js";
import type { Command } from "../interfaces/Command.js";
import dotenv from "dotenv";

dotenv.config();

const logger = new Logger("Client");

export class ExtendedClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public db: CustomDatabase;
  public nh!: NHentaiService;
  public cluster: ClusterClient<Client>;

  constructor() {
    super({
      intents: [GatewayIntentBits.Guilds],
      shards: getInfo().SHARD_LIST,
      shardCount: getInfo().TOTAL_SHARDS,
    });
    this.db = new CustomDatabase("json.sqlite");
    this.cluster = new ClusterClient(this);
  }

  async start() {
    const isDev = process.env.NODE_ENV === "development";
    const token = isDev ? process.env.TEST_DISCORD_TOKEN : process.env.DISCORD_TOKEN;

    if (!token) {
      logger.error(`${isDev ? "TEST_DISCORD_TOKEN" : "DISCORD_TOKEN"} is not set`);
      process.exit(1);
    }

    const accessToken = process.env.NH_ACCESS_TOKEN;
    const refreshToken = process.env.NH_REFRESH_TOKEN;
    if (!accessToken || !refreshToken) {
      logger.error("NH_ACCESS_TOKEN or NH_REFRESH_TOKEN is not set");
      process.exit(1);
    }

    this.nh = new NHentaiService(this.db, accessToken, refreshToken);
    await this.nh.init();

    await this.login(token);
    logger.success("Client started.");
  }

  stop() {
    this.nh?.destroy();
  }
}
