import { v7 } from "uuid";

export type SplitDetails = {
	id: string;
	totalAmount: number;
	repairCost: number;
	taxRate: number;
	memberCount: number;
	buyerPayment: number;
	amountPerPerson: number;
	createdBy: SplitMember;
	createdAt: Date;
};

export type SplitMember = {
	id: string;
	name: string;
};

export type LootsplitOptions = {
	id?: string;
	initialAmount?: number;
	initialRepair?: number;
	initialTax?: number;
	initialMembers?: SplitMember[];
};

export class Lootsplit {
	private readonly id: string;
	private totalAmount: number;
	private repairCost: number;
	private taxRate: number;
	private readonly memberList: Set<SplitMember>;
	private readonly createdBy: SplitMember;
	private readonly createdAt: Date;

	constructor(creator: SplitMember, options: LootsplitOptions = {}) {
		this.id = options.id ?? v7();
		this.totalAmount = options.initialAmount ?? 0;
		this.repairCost = options.initialRepair ?? 0;
		this.taxRate = options.initialTax ?? 10;
		this.memberList = new Set(options.initialMembers ?? []);
		this.createdBy = creator;
		this.createdAt = new Date();
	}

	getId(): string {
		return this.id;
	}

	getTotalAmount(): number {
		return this.totalAmount;
	}

	getRepairCost(): number {
		return this.repairCost;
	}

	getTaxRate(): number {
		return this.taxRate;
	}

	getMemberIds(): string[] {
		return Array.from(this.memberList).map((member) => member.id);
	}

	getMemberList(): SplitMember[] {
		return Array.from(this.memberList);
	}

	getMemberCount(): number {
		return this.memberList.size;
	}

	setTotalAmount(amount: number): boolean {
		if (
			!Number.isSafeInteger(amount) ||
			amount < 0 ||
			amount < this.repairCost
		) {
			return false;
		}

		this.totalAmount = amount;
		return true;
	}

	setRepairCost(cost: number): boolean {
		if (!Number.isSafeInteger(cost) || cost < 0 || cost > this.totalAmount) {
			return false;
		}
		this.repairCost = cost;
		return true;
	}

	setTaxRate(newRate: number): boolean {
		if (!Number.isSafeInteger(newRate) || newRate < 0 || newRate > 100) {
			return false;
		}
		this.taxRate = newRate;
		return true;
	}

	addMembers(members: SplitMember[]): void {
		members.forEach((member) => this.memberList.add(member));
	}

	removeMembers(members: SplitMember[]): void {
		members.forEach((member) => this.memberList.delete(member));
	}

	getSplitDetails(): SplitDetails {
		const afterRepairs = this.totalAmount - this.repairCost;
		const buyerProfit = afterRepairs * (this.taxRate / 100);
		const buyerPayment = Math.floor(afterRepairs - buyerProfit);
		const amountPerPerson =
			this.memberList.size > 0
				? Math.floor(buyerPayment / this.memberList.size)
				: 0;

		return {
			id: this.id,
			totalAmount: this.totalAmount,
			repairCost: this.repairCost,
			taxRate: this.taxRate,
			memberCount: this.memberList.size,
			buyerPayment,
			amountPerPerson,
			createdBy: this.createdBy,
			createdAt: this.createdAt,
		};
	}
}
