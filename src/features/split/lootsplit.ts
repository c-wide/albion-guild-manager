import assert from "node:assert";
import crypto from "node:crypto";
import type { Snowflake } from "discord.js";

export type SplitDetails = {
	totalAmount: number;
	repairCost: number;
	taxRate: number;
	memberCount: number;
	buyerPayment: number;
	amountPerPerson: number;
};

export class Lootsplit {
	private readonly id: string;
	private totalAmount: number;
	private repairCost: number;
	private taxRate: number;
	private memberList: Snowflake[];

	constructor(
		initialAmount = 0,
		initialRepair = 0,
		initialTax = 10,
		initialMembers: Snowflake[] = [],
	) {
		assert(
			Number.isSafeInteger(initialAmount) && initialAmount >= 0,
			"Invalid initial amount",
		);

		assert(
			Number.isSafeInteger(initialRepair) &&
				initialRepair >= 0 &&
				initialRepair <= initialAmount,
			"Invalid initial repair cost",
		);

		assert(
			Number.isSafeInteger(initialTax) && initialTax >= 0 && initialTax <= 100,
			"Invalid initial tax rate",
		);

		this.id = crypto.randomUUID();
		this.totalAmount = initialAmount;
		this.repairCost = initialRepair;
		this.taxRate = initialTax;
		this.memberList = initialMembers;
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

	getMemberList(): Snowflake[] {
		return [...this.memberList];
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

	getSplitDetails(): SplitDetails {
		const afterRepairs = this.totalAmount - this.repairCost;
		const buyerProfit = afterRepairs * (this.taxRate / 100);
		const buyerPayment = Math.floor(afterRepairs - buyerProfit);
		const amountPerPerson =
			this.memberList.length > 0
				? Math.floor(buyerPayment / this.memberList.length)
				: 0;

		return {
			totalAmount: this.totalAmount,
			repairCost: this.repairCost,
			taxRate: this.taxRate,
			memberCount: this.memberList.length,
			buyerPayment,
			amountPerPerson,
		};
	}
}
