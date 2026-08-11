import { useEffect, useState } from "react";
import { useUnsignedSigningDocument as useUnsignedSigningDocumentQuery } from "../public-signing.queries";
import type { PublicSigningToken } from "../public-signing-token";

export function useUnsignedSigningDocument(
	token: PublicSigningToken,
	requestId?: string,
) {
	const query = useUnsignedSigningDocumentQuery(token, requestId);
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!query.data) {
			setObjectUrl(null);
			return;
		}

		const nextObjectUrl = URL.createObjectURL(query.data);
		setObjectUrl(nextObjectUrl);

		return () => URL.revokeObjectURL(nextObjectUrl);
	}, [query.data]);

	return { ...query, objectUrl };
}
