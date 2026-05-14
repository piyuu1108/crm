export interface LabMachine {
	id: string;
	pcName: string;
	hardwareId: string;
	labName: string | null;
	lastSeenAt: Date | null;
	latestSession: {
		id: string;
		status: string;
		loginAt: Date;
		student: {
			id: string;
			name: string;
		} | null;
	} | null;
}
