import { BigInt } from "@graphprotocol/graph-ts"
import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  BatchCreated as BatchCreatedEvent,
  BatchMetadataUpdate as BatchMetadataUpdateEvent,
  BatchStatusUpdated as BatchStatusUpdatedEvent,
  MetadataUpdate as MetadataUpdateEvent,
  Transfer as TransferEvent
} from "../generated/SupplyChain/SupplyChain"
import { Actor, Batch, SupplyChain } from "../generated/schema"
import { BATCH_STATE_MAP } from "./constants"

export function handleBatchMetadataUpdate(event: BatchMetadataUpdateEvent): void {}
export function handleApprovalForAll(event: ApprovalForAllEvent): void {}
export function handleMetadataUpdate(event: MetadataUpdateEvent): void {}
export function handleApproval(event: ApprovalEvent): void {}
export function handleTransfer(event: TransferEvent): void {}

export function handleBatchCreated(event: BatchCreatedEvent): void {
  let batch = new Batch(event.params.batchId.toString())
  batch.state = "HARVESTED"
  let farmer = Actor.load(event.params.actorId.toHexString())
  if (!farmer) return
  batch.farmer = farmer.id
  batch.hash = event.params.hash
  batch.createdAt = event.params.timestamp
  batch.distributors = []
  batch.retailers = []
  batch.save()

  const farmersBatches = farmer.batches
  farmersBatches.push(batch.id)
  farmer.batches = farmersBatches
  farmer.save()

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

  const batches = supplyChain.batches
  batches.push(batch.id)
  supplyChain.batches = batches

  supplyChain.totalBatches = supplyChain.totalBatches.plus(BigInt.fromI32(1))
  supplyChain.activeBatches = supplyChain.activeBatches.plus(BigInt.fromI32(1))
  supplyChain.transactions = supplyChain.transactions.plus(BigInt.fromI32(1))
  supplyChain.save()
}

export function handleBatchStatusUpdated(event: BatchStatusUpdatedEvent): void {
  let batch = Batch.load(event.params.batchId.toString())
  let supplyChain = SupplyChain.load("supply-chain")
  if (batch == null || supplyChain == null) return

  let stateIndex = changetype<i32>(event.params.state);
  if (stateIndex < 0 || stateIndex >= BATCH_STATE_MAP.length) return

  batch.state = BATCH_STATE_MAP[stateIndex]
  batch.hash = event.params.hash

  let involvedActor = Actor.load(event.params.actorId.toHexString())
  if (!involvedActor) return
  const actorsBatches = involvedActor.batches
  actorsBatches.push(batch.id)
  involvedActor.batches = actorsBatches
  involvedActor.save()
  
  if (batch.state == "INTRANSIT") supplyChain.inTransit = supplyChain.inTransit.plus(BigInt.fromI32(1))
  else if (batch.state == "ATRETAILERS") {
    supplyChain.retailedBatches = supplyChain.retailedBatches.plus(BigInt.fromI32(1))
    const retailer = Actor.load(event.params.actorId.toHexString())
    
    if (!retailer) return
    
    const retailers = batch.retailers
    retailers.push(retailer.id)
    batch.retailers = retailers
  } else if (batch.state == "ATDISTRIBUTORS") {
    const distributor = Actor.load(event.params.actorId.toHexString())
    
    if (!distributor) return
    
    const distributors = batch.distributors
    distributors.push(distributor.id)
    batch.distributors = distributors
  } else if (batch.state == "TOCUSTOMERS") supplyChain.activeBatches = supplyChain.activeBatches.minus(BigInt.fromI32(1))

  supplyChain.transactions = supplyChain.transactions.plus(BigInt.fromI32(1))
  batch.save()
  supplyChain.save()
}