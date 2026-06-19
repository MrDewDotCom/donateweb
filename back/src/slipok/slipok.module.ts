import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SlipokService } from './slipok.service';

@Module({
    imports: [HttpModule],
    providers: [SlipokService],
    exports: [SlipokService],
})
export class SlipokModule { }