import {
  Controller,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BadgesService } from './badges.service';
import { SPECIAL_BADGE_TOA_COMMUNITY } from './badges.constants';

@ApiTags('badges')
@ApiBearerAuth('JWT-auth')
@Controller('badges')
@UseGuards(JwtAuthGuard)
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get('members/:userId/profile')
  @ApiOperation({
    summary: 'Public-style badge profile for a member',
    description:
      'Returns name, avatar, total badge count, and one badge per series (strongest tier), sorted for display. Requires authentication.',
  })
  @ApiParam({ name: 'userId', type: Number })
  @ApiResponse({ status: 200, description: 'Member badge profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async memberBadgeProfile(@Param('userId', ParseIntPipe) userId: number) {
    return this.badgesService.getPublicMemberBadgeProfile(userId);
  }

  @Get()
  @ApiOperation({
    summary: 'List my badges',
    description:
      'Returns earned badges; syncs Academy, blog, Culture, Troc, parrainage, Te Natira\'a présence, témoignages vidéo validés, formations publiées, soutien, série Découverte, badges spéciaux (fondateur, pionnier troc, Pūpū, VIP, Toa) from existing activity.',
  })
  @ApiResponse({ status: 200, description: 'List of badges' })
  async myBadges(@Request() req: { user: { id: number } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const badges = await this.badgesService.listBadgesForUser(userId);
    const completedCourseCount = await this.badgesService.countFullyCompletedCourses(userId);
    const activeBlogPostCount = await this.badgesService.countActiveBlogPostsByAuthor(userId);
    const cultureConsultationCount = await this.badgesService.countCultureConsultationsByUser(userId);
    const completedTrocExchangeCount = await this.badgesService.countCompletedTrocExchangesForUser(userId);
    const validatedReferralCount = await this.badgesService.countValidatedReferralsByReferrer(userId);
    const testimonialApprovedCount =
      await this.badgesService.countApprovedTestimonialVideosByUser(userId);
    const { formateurPoints, soutienPoints, tenatiraaPresencePoints, walletPupuBalance } =
      await this.badgesService.getGamificationCounters(userId);
    const discovery = await this.badgesService.getDiscoveryUniverseCounts(userId);
    const discoveryTotalTypes =
      discovery.transmettre + discovery.connecter + discovery.inspirer;
    const nonToaBadgeCount = badges.filter((b) => b.badgeCode !== SPECIAL_BADGE_TOA_COMMUNITY).length;
    return {
      badges: badges.map((b) => ({
        badgeCode: b.badgeCode,
        earnedAt: b.earnedAt,
      })),
      completedCourseCount,
      activeBlogPostCount,
      cultureConsultationCount,
      completedTrocExchangeCount,
      validatedReferralCount,
      testimonialApprovedCount,
      formateurPoints,
      soutienPoints,
      tenatiraaPresencePoints,
      walletPupuBalance,
      nonToaBadgeCount,
      discovery: {
        transmettre: discovery.transmettre,
        connecter: discovery.connecter,
        inspirer: discovery.inspirer,
        totalTypes: discoveryTotalTypes,
      },
    };
  }
}
