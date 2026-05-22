import type { FastifyInstance } from 'fastify'
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphql,
} from 'graphql'

import {
  ALL_CATEGORIES_FILTER,
  LISTING_CATEGORIES,
  type ListingCategoryFilter,
  type Review,
} from '../shared'
import type { FavouritesService } from '../services/favouritesService'
import type { AuthService } from '../services/authService'
import type { AuditService } from '../services/auditService'
import type { ChatService } from '../services/chatService'
import type { RolesService } from '../services/rolesService'
import type { ListingsService } from '../services/listingsService'
import type { ReviewsService } from '../services/reviewsService'
import type { StatsService } from '../services/statsService'
import type { UsersService } from '../services/usersService'
import {
  adminDashboardQuerySchema,
  authLoginSchema,
  authRegisterSchema,
  createListingSchema,
  favouriteBodySchema,
  favouriteQuerySchema,
  chatMessagesQuerySchema,
  chatSendSchema,
  listingQuerySchema,
  reviewBodySchema,
  reviewUpdateSchema,
  sellersQuerySchema,
  updateListingSchema,
} from '../schemas'
import type { MemoryStore } from '../storage/memoryStore'
import type { ServerHub } from '../transport/serverHub'
import {
  addListingToStore,
  updateListingInStore,
  removeListingFromStore,
  addReviewToStore,
  updateReviewInStore,
  removeReviewFromStore,
  addFavouriteToStore,
  removeFavouriteFromStore,
  addConversationToStore,
  addMessageToStore,
} from '../db/storeUpdates'
import { createGeneratorController, type GeneratorStartInput } from './generator'
import { prisma } from '../db/prisma'
import { getMongoClient } from '../db/mongo'

export interface GraphQLRouteDeps {
  store: MemoryStore
  hub: ServerHub
  authService: AuthService
  auditService: AuditService
  chatService: ChatService
  rolesService: RolesService
  usersService: UsersService
  listingsService: ListingsService
  favouritesService: FavouritesService
  reviewsService: ReviewsService
  statsService: StatsService
}

const parseWithSchema = <T>(schema: { parse: (input: unknown) => T }, input: unknown): T => {
  try {
    return schema.parse(input)
  } catch {
    throw new Error('Validation failed')
  }
}

const logAction = async (
  context: GraphQLRouteDeps,
  userId: string,
  action: string,
  details: string,
): Promise<void> => {
  try {
    const user = context.store.state.users.find((u) => u.id === userId)
    if (!user?.role) return

    await context.auditService.recordAction({
      userId,
      role: user.role,
      action,
      details,
    })

    const recentCount = context.store.state.messages.filter(
      (m) => m.senderId === userId && Date.now() - new Date(m.createdAt).getTime() < 60000,
    ).length

    await context.auditService.detectMaliciousBehavior({
      userId,
      role: user.role,
      action,
      recentActionCount: recentCount,
      timeWindowMs: 60000,
    })
  } catch {
    // Audit logging should not break the main operation
  }
}

const PublicUserType = new GraphQLObjectType({
  name: 'PublicUser',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    avatarUrl: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: GraphQLString },
    permissions: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
  }),
})

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    avatarUrl: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: GraphQLString },
    permissions: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
    passwordHash: { type: GraphQLString },
  }),
})

const HealthStatusType = new GraphQLObjectType({
  name: 'HealthStatus',
  fields: () => ({
    ok: { type: new GraphQLNonNull(GraphQLBoolean) },
    postgres: { type: new GraphQLNonNull(GraphQLBoolean) },
    mongo: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
})

const RoleType = new GraphQLObjectType({
  name: 'Role',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    permissions: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
  }),
})

const ActionLogType = new GraphQLObjectType({
  name: 'ActionLog',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    userId: { type: new GraphQLNonNull(GraphQLID) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: new GraphQLNonNull(GraphQLString) },
    action: { type: new GraphQLNonNull(GraphQLString) },
    details: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
})

const SuspiciousUserType = new GraphQLObjectType({
  name: 'SuspiciousUser',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    userId: { type: new GraphQLNonNull(GraphQLID) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: new GraphQLNonNull(GraphQLString) },
    reason: { type: new GraphQLNonNull(GraphQLString) },
    score: { type: new GraphQLNonNull(GraphQLInt) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
    resolvedAt: { type: GraphQLString },
  }),
})

const ChatMessageType = new GraphQLObjectType({
  name: 'ChatMessage',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    conversationId: { type: new GraphQLNonNull(GraphQLID) },
    senderId: { type: new GraphQLNonNull(GraphQLID) },
    recipientId: { type: new GraphQLNonNull(GraphQLID) },
    listingId: { type: new GraphQLNonNull(GraphQLID) },
    body: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    readAt: { type: GraphQLString },
  }),
})

const ConversationType = new GraphQLObjectType({
  name: 'Conversation',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    listingId: { type: new GraphQLNonNull(GraphQLID) },
    participantIds: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
})

const ListingType = new GraphQLObjectType({
  name: 'Listing',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    price: { type: new GraphQLNonNull(GraphQLInt) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    photos: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
    sellerId: { type: new GraphQLNonNull(GraphQLID) },
    datePosted: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
  }),
})

const ReviewType = new GraphQLObjectType<Review, GraphQLRouteDeps>({
  name: 'Review',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    listingId: { type: new GraphQLNonNull(GraphQLID) },
    userId: { type: new GraphQLNonNull(GraphQLID) },
    rating: { type: new GraphQLNonNull(GraphQLInt) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    body: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
    user: {
      type: UserType,
      resolve: async (review, _args, context) => {
        return context.usersService.getById(review.userId)
      },
    },
    listing: {
      type: ListingType,
      resolve: async (review, _args, context) => {
        return context.listingsService.getById(review.listingId)
      },
    },
  }),
})

const ReviewConnectionType = new GraphQLObjectType({
  name: 'ReviewConnection',
  fields: () => ({
    items: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ReviewType))) },
    totalItems: { type: new GraphQLNonNull(GraphQLInt) },
  }),
})

const ListingConnectionType = new GraphQLObjectType({
  name: 'ListingConnection',
  fields: () => ({
    items: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ListingType))) },
    totalItems: { type: new GraphQLNonNull(GraphQLInt) },
    totalPages: { type: new GraphQLNonNull(GraphQLInt) },
    currentPage: { type: new GraphQLNonNull(GraphQLInt) },
  }),
})

const ReviewStatsListingType = new GraphQLObjectType({
  name: 'ReviewStatsListing',
  fields: () => ({
    listingId: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    count: { type: new GraphQLNonNull(GraphQLInt) },
    averageRating: { type: new GraphQLNonNull(GraphQLFloat) },
  }),
})

const ReviewStatsUserType = new GraphQLObjectType({
  name: 'ReviewStatsUser',
  fields: () => ({
    userId: { type: new GraphQLNonNull(GraphQLID) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    count: { type: new GraphQLNonNull(GraphQLInt) },
    averageRating: { type: new GraphQLNonNull(GraphQLFloat) },
  }),
})

const ReviewStatsType = new GraphQLObjectType({
  name: 'ReviewStats',
  fields: () => ({
    totalReviews: { type: new GraphQLNonNull(GraphQLInt) },
    averageRating: { type: new GraphQLNonNull(GraphQLFloat) },
    byListing: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ReviewStatsListingType))) },
    byUser: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ReviewStatsUserType))) },
  }),
})

const CategoryStatsType = new GraphQLObjectType({
  name: 'CategoryStats',
  fields: () => ({
    category: { type: new GraphQLNonNull(GraphQLString) },
    count: { type: new GraphQLNonNull(GraphQLInt) },
    averagePrice: { type: new GraphQLNonNull(GraphQLInt) },
    totalValue: { type: new GraphQLNonNull(GraphQLInt) },
    color: { type: new GraphQLNonNull(GraphQLString) },
  }),
})

const TopSellerType = new GraphQLObjectType({
  name: 'TopSeller',
  fields: () => ({
    rank: { type: new GraphQLNonNull(GraphQLInt) },
    seller: { type: new GraphQLNonNull(UserType) },
    listingCount: { type: new GraphQLNonNull(GraphQLInt) },
    rating: { type: new GraphQLNonNull(GraphQLFloat) },
  }),
})

const FavouriteStatsListingType = new GraphQLObjectType({
  name: 'FavouriteStatsListing',
  fields: () => ({
    listingId: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    price: { type: new GraphQLNonNull(GraphQLInt) },
    count: { type: new GraphQLNonNull(GraphQLInt) },
  }),
})

const FavouriteStatsUserType = new GraphQLObjectType({
  name: 'FavouriteStatsUser',
  fields: () => ({
    userId: { type: new GraphQLNonNull(GraphQLID) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    count: { type: new GraphQLNonNull(GraphQLInt) },
  }),
})

const FavouriteStatsType = new GraphQLObjectType({
  name: 'FavouriteStats',
  fields: () => ({
    totalFavourites: { type: new GraphQLNonNull(GraphQLInt) },
    byListing: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(FavouriteStatsListingType))) },
    byUser: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(FavouriteStatsUserType))) },
  }),
})

const SyncStateType = new GraphQLObjectType({
  name: 'SyncState',
  fields: () => ({
    mode: { type: new GraphQLNonNull(GraphQLString) },
    queuedMutations: { type: new GraphQLNonNull(GraphQLInt) },
    lastSyncedAt: { type: GraphQLString },
    serverReachable: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
})

const FavouriteType = new GraphQLObjectType({
  name: 'Favourite',
  fields: () => ({
    userId: { type: new GraphQLNonNull(GraphQLID) },
    listingId: { type: new GraphQLNonNull(GraphQLID) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
})

const SyncStateResponseType = new GraphQLObjectType({
  name: 'SyncStateResponse',
  fields: () => ({
    users: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PublicUserType))) },
    listings: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ListingType))) },
    reviews: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ReviewType))) },
    favourites: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(FavouriteType))) },
    conversations: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ConversationType))) },
    messages: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ChatMessageType))) },
    sync: { type: new GraphQLNonNull(SyncStateType) },
  }),
})

const GeneratorStatusType = new GraphQLObjectType({
  name: 'GeneratorStatus',
  fields: () => ({
    running: { type: new GraphQLNonNull(GraphQLBoolean) },
    batchSize: { type: GraphQLInt },
    intervalMs: { type: GraphQLInt },
    entityType: { type: GraphQLString },
  }),
})

const StatsType = new GraphQLObjectType({
  name: 'Stats',
  fields: () => ({
    totalUsers: { type: new GraphQLNonNull(GraphQLInt) },
    totalListings: { type: new GraphQLNonNull(GraphQLInt) },
    activeListings: { type: new GraphQLNonNull(GraphQLInt) },
    soldListings: { type: new GraphQLNonNull(GraphQLInt) },
    totalFavourites: { type: new GraphQLNonNull(GraphQLInt) },
    totalListingValue: { type: new GraphQLNonNull(GraphQLInt) },
    averageListingPrice: { type: new GraphQLNonNull(GraphQLInt) },
  }),
})

const FavouriteListingRowType = new GraphQLObjectType({
  name: 'FavouriteListingRow',
  fields: () => ({
    listing: { type: new GraphQLNonNull(ListingType) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
})

const FavouriteListType = new GraphQLObjectType({
  name: 'FavouriteList',
  fields: () => ({
    userId: { type: new GraphQLNonNull(GraphQLID) },
    totalItems: { type: new GraphQLNonNull(GraphQLInt) },
    items: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(FavouriteListingRowType))) },
  }),
})

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    health: {
      type: new GraphQLNonNull(HealthStatusType),
      resolve: async () => {
        let postgres = false
        let mongo = false

        try {
          await prisma.$queryRaw`SELECT 1`
          postgres = true
        } catch {
          postgres = false
        }

        try {
          const client = await getMongoClient()
          mongo = Boolean(client)
        } catch {
          mongo = false
        }

        return {
          ok: postgres,
          postgres,
          mongo,
        }
      },
    },
    listings: {
      type: ListingConnectionType,
      args: {
        category: { type: GraphQLString },
        search: { type: GraphQLString },
        status: { type: GraphQLString },
        page: { type: GraphQLInt },
        pageSize: { type: GraphQLInt },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(listingQuerySchema, {
          category: typeof args.category === 'string' ? args.category : undefined,
          search: typeof args.search === 'string' ? args.search : undefined,
          status: typeof args.status === 'string' ? args.status : undefined,
          page: args.page,
          pageSize: args.pageSize,
        })
        const category = (LISTING_CATEGORIES as readonly string[]).includes(String(parsed.category))
          ? (String(parsed.category) as ListingCategoryFilter)
          : ALL_CATEGORIES_FILTER
        const status = parsed.status === 'Active' || parsed.status === 'Sold' ? parsed.status : 'All'
        const search = parsed.search
        const result = await context.listingsService.list({
          category,
          search,
          status,
          page: parsed.page,
          pageSize: parsed.pageSize,
        })

        return {
          items: result.rows,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
        }
      },
    },
    reviewsForListing: {
      type: ReviewConnectionType,
      args: {
        listingId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const listing = await context.listingsService.getById(String(args.listingId))
        if (!listing) {
          throw new Error('Listing not found')
        }
        const items = await context.reviewsService.listForListing(String(args.listingId))
        return { items, totalItems: items.length }
      },
    },
    listingById: {
      type: ListingType,
      args: {
        listingId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const listing = await context.listingsService.getById(String(args.listingId))
        if (!listing) {
          throw new Error('Listing not found')
        }
        return listing
      },
    },
    categoriesStats: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(CategoryStatsType))),
      resolve: async (_root, _args, context: GraphQLRouteDeps) => {
        return context.statsService.categories()
      },
    },
    sellersStats: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(TopSellerType))),
      args: {
        limit: { type: GraphQLInt },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(sellersQuerySchema, {
          limit: args.limit,
        })
        return context.statsService.sellers(parsed.limit)
      },
    },
    favouriteStats: {
      type: FavouriteStatsType,
      resolve: async (_root, _args, context: GraphQLRouteDeps) => {
        return context.statsService.favourites()
      },
    },
    roles: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(RoleType))),
      resolve: async (_root, _args, context: GraphQLRouteDeps) => {
        return context.rolesService.listRoles().then((rows) =>
          rows.map((row) => ({
            ...row,
            permissions: row.permissions.map((permission) => permission.name),
          })),
        )
      },
    },
    adminDashboard: {
      type: new GraphQLObjectType({
        name: 'AdminDashboard',
        fields: () => ({
          logs: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ActionLogType))) },
          suspiciousUsers: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(SuspiciousUserType))) },
        }),
      }),
      args: {
        limit: { type: GraphQLInt },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(adminDashboardQuerySchema, { limit: args.limit })
        return context.auditService.dashboard(parsed.limit)
      },
    },
    conversationsForUser: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ConversationType))),
      args: {
        userId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        return context.chatService.listConversationsForUser(String(args.userId))
      },
    },
    messagesForConversation: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ChatMessageType))),
      args: {
        conversationId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(chatMessagesQuerySchema, { conversationId: args.conversationId })
        return context.chatService.listMessages(parsed.conversationId)
      },
    },
    stats: {
      type: StatsType,
      resolve: async (_root, _args, context: GraphQLRouteDeps) => {
        return context.statsService.summary()
      },
    },
    reviewStats: {
      type: ReviewStatsType,
      resolve: async (_root, _args, context: GraphQLRouteDeps) => {
        return context.statsService.reviews()
      },
    },
    syncState: {
      type: SyncStateResponseType,
      resolve: async (_root, _args, context: GraphQLRouteDeps) => {
        return {
          users: context.store.state.users.map(({ passwordHash: _ignored, ...user }) => user),
          listings: context.store.state.listings,
          reviews: context.store.state.reviews,
          favourites: context.store.state.favourites,
          conversations: context.store.state.conversations,
          messages: context.store.state.messages,
          sync: context.store.state.sync,
        }
      },
    },
    login: {
      type: new GraphQLNonNull(UserType),
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(authLoginSchema, { email: args.email, password: args.password })
        const result = await context.authService.login(parsed)
        await logAction(context, result.user.id, 'auth/login', `User ${result.user.username} logged in`)
        return result.user
      },
    },
    register: {
      type: new GraphQLNonNull(UserType),
      args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(authRegisterSchema, {
          username: args.username,
          email: args.email,
          password: args.password,
        })
        const result = await context.authService.register(parsed)
        await logAction(context, result.user.id, 'auth/register', `User ${result.user.username} registered`)
        return result.user
      },
    },
    favouritesForUser: {
      type: FavouriteListType,
      args: {
        userId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(favouriteQuerySchema, { userId: args.userId })
        if (!(await context.usersService.exists(parsed.userId))) {
          throw new Error('User not found')
        }
        const items = await context.favouritesService.listForUser(parsed.userId)
        return {
          userId: parsed.userId,
          totalItems: items.length,
          items,
        }
      },
    },
  }),
})

const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    toggleFavourite: {
      type: GraphQLBoolean,
      args: {
        userId: { type: new GraphQLNonNull(GraphQLID) },
        listingId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(favouriteBodySchema, {
          userId: args.userId,
          listingId: args.listingId,
        })
        if (!(await context.usersService.exists(parsed.userId))) {
          throw new Error('User not found')
        }
        if (!(await context.listingsService.getById(parsed.listingId))) {
          throw new Error('Listing not found')
        }
        const result = await context.favouritesService.add(parsed.userId, parsed.listingId)
        if (result) {
          addFavouriteToStore(context.store, result.favourite)
          context.hub.broadcast({ sync: context.store.state.sync })
          await logAction(context, parsed.userId, 'favourite/toggle', `Added favourite for listing ${parsed.listingId}`)
        }
        return Boolean(result)
      },
    },
    removeFavourite: {
      type: GraphQLBoolean,
      args: {
        userId: { type: new GraphQLNonNull(GraphQLID) },
        listingId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(favouriteQuerySchema, {
          userId: args.userId,
        })
        if (!(await context.usersService.exists(parsed.userId))) {
          throw new Error('User not found')
        }
        const listingId = String(args.listingId)
        if (!(await context.listingsService.getById(listingId))) {
          throw new Error('Listing not found')
        }
        const removed = await context.favouritesService.remove(parsed.userId, listingId)
        if (removed) {
          removeFavouriteFromStore(context.store, parsed.userId, listingId)
          context.hub.broadcast({ sync: context.store.state.sync })
          await logAction(context, parsed.userId, 'favourite/toggle', `Removed favourite for listing ${listingId}`)
        }
        return removed
      },
    },
    createReview: {
      type: ReviewType,
      args: {
        listingId: { type: new GraphQLNonNull(GraphQLID) },
        userId: { type: new GraphQLNonNull(GraphQLID) },
        rating: { type: new GraphQLNonNull(GraphQLInt) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        body: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(reviewBodySchema, {
          listingId: args.listingId,
          userId: args.userId,
          rating: Number(args.rating),
          title: args.title,
          body: args.body,
        })
        if (!(await context.usersService.exists(parsed.userId))) {
          throw new Error('User not found')
        }
        if (!(await context.listingsService.getById(parsed.listingId))) {
          throw new Error('Listing not found')
        }
        const review = await context.reviewsService.create(parsed)
        addReviewToStore(context.store, review)
        context.hub.broadcast({ reviews: [review], sync: context.store.state.sync })
        await logAction(context, parsed.userId, 'review/create', `Created review for listing ${parsed.listingId}`)
        return review
      },
    },
    updateReview: {
      type: ReviewType,
      args: {
        reviewId: { type: new GraphQLNonNull(GraphQLID) },
        rating: { type: GraphQLInt },
        title: { type: GraphQLString },
        body: { type: GraphQLString },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const updates: Record<string, unknown> = {}
        if (args.rating !== null && args.rating !== undefined) {
          updates.rating = args.rating
        }
        if (args.title !== null && args.title !== undefined) {
          updates.title = args.title
        }
        if (args.body !== null && args.body !== undefined) {
          updates.body = args.body
        }
        const parsed = parseWithSchema(reviewUpdateSchema, updates)
        const updated = await context.reviewsService.update(String(args.reviewId), parsed)
        if (updated) {
          updateReviewInStore(context.store, updated)
          context.hub.broadcast({ reviews: [updated], sync: context.store.state.sync })
          await logAction(context, updated.userId, 'review/update', `Updated review ${String(args.reviewId)}`)
        }
        return updated
      },
    },
    deleteReview: {
      type: GraphQLBoolean,
      args: {
        reviewId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const review = context.store.state.reviews.find((r) => r.id === String(args.reviewId))
        const removed = await context.reviewsService.delete(String(args.reviewId))
        if (removed) {
          removeReviewFromStore(context.store, String(args.reviewId))
          context.hub.broadcast({ removedReviewIds: [String(args.reviewId)], sync: context.store.state.sync })
          if (review) {
            await logAction(context, review.userId, 'review/delete', `Deleted review ${String(args.reviewId)}`)
          }
        }
        return removed
      },
    },
    createListing: {
      type: ListingType,
      args: {
        id: { type: GraphQLID },
        datePosted: { type: GraphQLString },
        title: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: new GraphQLNonNull(GraphQLString) },
        price: { type: new GraphQLNonNull(GraphQLInt) },
        category: { type: new GraphQLNonNull(GraphQLString) },
        photos: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))) },
        sellerId: { type: new GraphQLNonNull(GraphQLID) },
        status: { type: GraphQLString },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(createListingSchema, {
          id: args.id,
          datePosted: args.datePosted,
          title: args.title,
          description: args.description,
          price: Number(args.price),
          category: args.category,
          photos: (args.photos ?? []).map((photo: string) => String(photo)),
          sellerId: args.sellerId,
          status: args.status === 'Sold' ? 'Sold' : 'Active',
        })
        const listing = await context.listingsService.create(parsed)
        const seller = await context.usersService.getById(parsed.sellerId)
        addListingToStore(context.store, listing)
        context.hub.broadcast({
          listings: [listing],
          users: seller ? [seller] : undefined,
          sync: context.store.state.sync,
        })
        await logAction(context, parsed.sellerId, 'listing/create', `Created listing "${parsed.title}"`)
        return listing
      },
    },
    updateListing: {
      type: ListingType,
      args: {
        listingId: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLString },
        description: { type: GraphQLString },
        price: { type: GraphQLInt },
        category: { type: GraphQLString },
        photos: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
        status: { type: GraphQLString },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const updates: Record<string, unknown> = {}
        if (args.title !== null && args.title !== undefined) {
          updates.title = args.title
        }
        if (args.description !== null && args.description !== undefined) {
          updates.description = args.description
        }
        if (args.price !== null && args.price !== undefined) {
          updates.price = Number(args.price)
        }
        if (args.category !== null && args.category !== undefined) {
          updates.category = args.category
        }
        if (args.photos !== null && args.photos !== undefined) {
          updates.photos = args.photos?.map((photo: string) => String(photo))
        }
        if (args.status === 'Sold' || args.status === 'Active') {
          updates.status = args.status
        }
        const parsed = parseWithSchema(updateListingSchema, updates)
        const updated = await context.listingsService.update(String(args.listingId), parsed)
        if (updated) {
          updateListingInStore(context.store, updated)
          context.hub.broadcast({ listings: [updated], sync: context.store.state.sync })
          await logAction(context, updated.sellerId, 'listing/update', `Updated listing "${updated.title}"`)
        }
        return updated
      },
    },
    deleteListing: {
      type: GraphQLBoolean,
      args: {
        listingId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const existing = context.store.state.listings.find((l) => l.id === String(args.listingId))
        const removed = await context.listingsService.delete(String(args.listingId))
        if (removed) {
          removeListingFromStore(context.store, String(args.listingId))
          context.hub.broadcast({ removedListingIds: [String(args.listingId)], sync: context.store.state.sync })
          if (existing) {
            await logAction(context, existing.sellerId, 'listing/delete', `Deleted listing "${existing.title}"`)
          }
        }
        return removed
      },
    },
    sendChatMessage: {
      type: new GraphQLNonNull(ChatMessageType),
      args: {
        conversationId: { type: GraphQLID },
        messageId: { type: GraphQLID },
        listingId: { type: new GraphQLNonNull(GraphQLID) },
        senderId: { type: new GraphQLNonNull(GraphQLID) },
        recipientId: { type: new GraphQLNonNull(GraphQLID) },
        body: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: GraphQLString },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const parsed = parseWithSchema(chatSendSchema, {
          conversationId: args.conversationId,
          messageId: args.messageId,
          listingId: args.listingId,
          senderId: args.senderId,
          recipientId: args.recipientId,
          body: args.body,
          createdAt: args.createdAt,
        })
        const result = await context.chatService.sendMessage(parsed)
        addConversationToStore(context.store, result.conversation)
        addMessageToStore(context.store, {
          id: result.message.id,
          conversationId: result.message.conversationId,
          senderId: result.message.senderId,
          recipientId: result.message.recipientId,
          listingId: result.message.listingId,
          body: result.message.body,
          createdAt: result.message.createdAt,
          readAt: result.message.readAt,
        })
        context.hub.broadcast({
          conversations: [result.conversation],
          messages: [{
            id: result.message.id,
            conversationId: result.message.conversationId,
            senderId: result.message.senderId,
            recipientId: result.message.recipientId,
            listingId: result.message.listingId,
            body: result.message.body,
            createdAt: result.message.createdAt,
            readAt: result.message.readAt,
          }],
          sync: context.store.state.sync,
        })
        await logAction(context, parsed.senderId, 'chat/send', `Sent message in conversation ${result.conversation.id}`)
        return result.message
      },
    },
    startGenerator: {
      type: GeneratorStatusType,
      args: {
        batchSize: { type: GraphQLInt },
        intervalMs: { type: GraphQLInt },
        entityType: { type: GraphQLString },
      },
      resolve: async (_root, args, context: GraphQLRouteDeps) => {
        const controller = createGeneratorController({
          store: context.store,
          hub: context.hub,
          listingsService: context.listingsService,
          usersService: context.usersService,
        })
        return controller.start({
          batchSize: args.batchSize === undefined ? undefined : Number(args.batchSize),
          intervalMs: args.intervalMs === undefined ? undefined : Number(args.intervalMs),
          entityType: args.entityType ? (String(args.entityType) as GeneratorStartInput['entityType']) : undefined,
        })
      },
    },
    stopGenerator: {
      type: GeneratorStatusType,
      resolve: async (_root, _args, context: GraphQLRouteDeps) => {
        const controller = createGeneratorController({
          store: context.store,
          hub: context.hub,
          listingsService: context.listingsService,
          usersService: context.usersService,
        })
        return controller.stop()
      },
    },
  }),
})

const schema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
})

export const registerGraphQLRoutes = (app: FastifyInstance, deps: GraphQLRouteDeps): void => {
  app.post('/graphql', async (request, reply) => {
    const { query, variables, operationName } = request.body as {
      query?: string
      variables?: Record<string, unknown>
      operationName?: string
    }

    if (!query) {
      reply.code(400).send({ error: 'Query is required' })
      return
    }

    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      operationName,
      contextValue: deps,
    })

    if (result.errors?.length) {
      reply.code(400).send({ errors: result.errors.map((error) => error.message) })
      return
    }

    return reply.send(result)
  })
}
