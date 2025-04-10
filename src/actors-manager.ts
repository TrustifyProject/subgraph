import { BigInt } from "@graphprotocol/graph-ts"
import {
  ActorRegistered as ActorRegisteredEvent,
  ActorUpdated as ActorUpdatedEvent,
} from "../generated/ActorsManager/ActorsManager"
import { Actor, SupplyChain } from "../generated/schema"

export function handleActorRegistered(event: ActorRegisteredEvent): void {
  let supplyChain = SupplyChain.load("supply-chain")
  if (supplyChain == null) {
    supplyChain = new SupplyChain("supply-chain")
    supplyChain.totalBatches = BigInt.fromI32(0)
    supplyChain.totalActors = BigInt.fromI32(0)
    supplyChain.activeBatches = BigInt.fromI32(0)
    supplyChain.inTransit = BigInt.fromI32(0)
    supplyChain.retailedBatches = BigInt.fromI32(0)
    supplyChain.transactions = BigInt.fromI32(0)
    supplyChain.batches = []
    supplyChain.actors = []
  }
  
  let actor = new Actor(event.params.actorId.toString())

  actor.actorType = event.params.actorType.toString()
  actor.address = event.params.account
  actor.hash = event.params.hash
  actor.issuedAt = event.block.timestamp
  actor.batches = []

  supplyChain.totalActors = supplyChain.totalActors.plus(BigInt.fromI32(1))
  const actors = supplyChain.actors
  actors.push(actor.id)
  supplyChain.actors = actors

  supplyChain.save()
  actor.save()
}

export function handleActorUpdated(event: ActorUpdatedEvent): void {
  let actor = Actor.load(event.params.actorId.toString())
  if (actor == null) return

  actor.issuedAt = event.block.timestamp
  actor.hash = event.params.newHash
  actor.save()
}