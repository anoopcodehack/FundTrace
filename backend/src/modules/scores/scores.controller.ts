import { Controller, Get, Param } from '@nestjs/common';
import { ScoresService } from './scores.service';

@Controller('api/scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get(':address')
  async getScore(@Param('address') address: string) {
    return this.scoresService.getScore(address);
  }

  @Get(':address/history')
  async getScoreHistory(@Param('address') address: string) {
    return this.scoresService.getScoreHistory(address);
  }

  @Get(':address/recompute')
  async recompute(@Param('address') address: string) {
    const score = await this.scoresService.recomputeAndSaveScore(address);
    return { score, message: 'Score recomputed successfully' };
  }
}
