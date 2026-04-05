import type { MammographyCaseDeliveryInput } from "../../domain/mammography/contracts";
import type { IMammographySecondOpinionCaseRepository } from "../../domain/mammography/ports";
import {
  mapMammographySecondOpinionCaseToResponse,
  type MammographySecondOpinionCaseResponse,
} from "./GenerateMammographySecondOpinionUseCase";

export class MammographyCaseDeliveryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MammographyCaseDeliveryConflictError";
  }
}

export class DeliverMammographyCaseReportUseCase {
  constructor(
    private readonly repository: IMammographySecondOpinionCaseRepository,
  ) {}

  async execute(
    caseId: string,
    deliveryInput: MammographyCaseDeliveryInput,
  ): Promise<MammographySecondOpinionCaseResponse | null> {
    const caseAggregate = await this.repository.getById(caseId);

    if (!caseAggregate) {
      return null;
    }

    try {
      caseAggregate.recordDelivery(deliveryInput);
    } catch (error) {
      if (error instanceof Error && (
        error.message.startsWith("Cannot record delivery in state") ||
        error.message.startsWith("Delivery already recorded")
      )) {
        throw new MammographyCaseDeliveryConflictError(error.message);
      }

      throw error;
    }

    await this.repository.save(caseAggregate);
    return mapMammographySecondOpinionCaseToResponse(caseAggregate);
  }
}