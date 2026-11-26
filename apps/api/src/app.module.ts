import { Module } from "@nestjs/common";
import { InfrastructureModule } from "./infrastructure";
import { AuthModule } from "./auth/auth.module";
import { AccountModule } from "./account/account.module";
import { HealthModule } from "./health/health.module";
import { UploadsModule } from "./uploads/uploads.module";
import { CustomerModule } from "./customer/customer.module";
import { GarmentsModule } from "./garments/garments.module";
import { PresetsModule } from "./presets/presets.module";
import { ModelLibraryModule } from "./models/model-library.module";
import { JobsModule } from "./jobs/jobs.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    AccountModule,
    HealthModule,
    UploadsModule,
    CustomerModule,
    GarmentsModule,
    PresetsModule,
    ModelLibraryModule,
    JobsModule,
    AdminModule,
  ],
})
export class AppModule {}
