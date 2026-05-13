export type CsvRow = {
	collegeId: string;
	name: string;
	password: string;
};

export type ParseResult = {
	valid: CsvRow[];
	invalid: { line: number; reason: string; raw: string }[];
};

/**
 * Parse a CSV string into validated rows.
 * Expected format: collegeId,name,password (with header row).
 */
export function parseCsv(content: string): ParseResult {
	const lines = content
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0);

	if (lines.length === 0) {
		return { valid: [], invalid: [] };
	}

	// Validate header
	const header = lines[0].toLowerCase().replace(/\s/g, '');
	const expectedHeaders = ['collegeid,name,password', 'college_id,name,password'];
	if (!expectedHeaders.includes(header)) {
		return {
			valid: [],
			invalid: [{ line: 1, reason: 'Invalid header. Expected: collegeId,name,password', raw: lines[0] }]
		};
	}

	const valid: CsvRow[] = [];
	const invalid: ParseResult['invalid'] = [];

	for (let i = 1; i < lines.length; i++) {
		const parts = lines[i].split(',').map((p) => p.trim());

		if (parts.length < 3) {
			invalid.push({ line: i + 1, reason: 'Missing columns', raw: lines[i] });
			continue;
		}

		const [collegeId, name, password] = parts;

		if (!collegeId) {
			invalid.push({ line: i + 1, reason: 'Missing collegeId', raw: lines[i] });
			continue;
		}
		if (!name) {
			invalid.push({ line: i + 1, reason: 'Missing name', raw: lines[i] });
			continue;
		}
		if (!password) {
			invalid.push({ line: i + 1, reason: 'Missing password', raw: lines[i] });
			continue;
		}

		valid.push({ collegeId, name, password });
	}

	return { valid, invalid };
}
