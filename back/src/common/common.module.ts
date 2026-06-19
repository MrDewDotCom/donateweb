import { Global, Module } from '@nestjs/common';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';

@Global()
@Module({
    providers: [AdminApiKeyGuard],
    exports: [AdminApiKeyGuard],
})
export class CommonModule { }
