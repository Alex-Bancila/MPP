import type { MemoryStore } from '../storage/memoryStore'
import { createAuthService } from './authService'
import { createAuditService } from './auditService'
import { createChatService } from './chatService'
import { createFavouritesService } from './favouritesService'
import { createListingsService } from './listingsService'
import { createRolesService } from './rolesService'
import { createReviewsService } from './reviewsService'
import { createStatsService } from './statsService'
import { createUsersService } from './usersService'

export const createServices = (store: MemoryStore) => {
  const authService = createAuthService(store)
  const rolesService = createRolesService(store)
  const auditService = createAuditService(store)
  const chatService = createChatService(store)
  const usersService = createUsersService(store)
  const listingsService = createListingsService(store, usersService)
  const favouritesService = createFavouritesService(store, usersService)
  const reviewsService = createReviewsService(store)
  const statsService = createStatsService(store)

  return {
    authService,
    rolesService,
    auditService,
    chatService,
    usersService,
    listingsService,
    favouritesService,
    reviewsService,
    statsService,
  }
}
