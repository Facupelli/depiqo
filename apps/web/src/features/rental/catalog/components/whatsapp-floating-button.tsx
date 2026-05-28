import { useState } from "react";

const WHATSAPP_GREEN = "#25D366";
const WHATSAPP_MESSAGE = "¿No encontrás tu combo? Escribinos y te lo armamos";

type WhatsAppFloatProps = {
	phoneNumber: string;
};

export default function WhatsAppFloat({ phoneNumber }: WhatsAppFloatProps) {
	const [bubbleVisible, setBubbleVisible] = useState(true);

	const encodedMessage = encodeURIComponent(WHATSAPP_MESSAGE);
	const href = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={WHATSAPP_MESSAGE}
			className="group fixed bottom-2 right-2 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-4"
		>
			{/* ── Chat bubble ──────────────────────────────────────────────── */}
			{bubbleVisible && (
				<div
					className="
            relative
            max-w-55
            rounded-2xl
            bg-white
            px-4 py-3
            shadow-lg shadow-black/20
            animate-wa-bubble-in
            transition-transform duration-200
          "
				>
					{/* Dismiss button */}
					<button
						aria-label="Cerrar"
						onClick={(e) => {
							e.preventDefault(); // don't follow the <a> href
							e.stopPropagation(); // don't bubble up to the <a>
							setBubbleVisible(false);
						}}
						className="
              absolute -top-2 -right-2
              flex h-5 w-5 items-center justify-center
              rounded-full
              bg-gray-400
              text-white text-[11px] font-bold leading-none
              transition-colors duration-150
              cursor-pointer
            "
					>
						✕
					</button>

					{/* Copy */}
					<p className="text-[13.5px] font-semibold leading-snug text-gray-800 tracking-tight">
						¿No encontrás tu combo?{" "}
						<span className="font-normal text-gray-500">
							Escribinos y te lo armamos
						</span>
					</p>

					{/* Bubble tail — flush against the bottom edge, no gap */}
					<span
						aria-hidden="true"
						className="
              absolute -bottom-2 right-5
              border-x-[9px] border-x-transparent
              border-t-[9px] border-t-white
            "
					/>
				</div>
			)}

			{/* ── WhatsApp button ───────────────────────────────────────────── */}
			<div
				className="
          flex h-14 w-14 items-center justify-center
          rounded-full
          shadow-xl shadow-black/25
          animate-wa-btn-in
          transition-all duration-200
          group-hover:scale-110
          group-hover:shadow-2xl
          group-active:scale-95
        "
				style={{ backgroundColor: WHATSAPP_GREEN }}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 32 32"
					className="h-8 w-8"
					aria-hidden="true"
				>
					<path
						fill="#fff"
						d="M16.002 2C8.27 2 2 8.268 2 15.998c0 2.49.65 4.824 1.785 6.845L2 30l7.335-1.763A14.006 14.006 0 0 0 16.002 30C23.73 30 30 23.73 30 16.002 30 8.27 23.73 2 16.002 2zm0 25.647a11.614 11.614 0 0 1-5.928-1.624l-.425-.252-4.354 1.047 1.07-4.232-.278-.437A11.582 11.582 0 0 1 4.39 16c0-6.407 5.207-11.61 11.612-11.61S27.614 9.593 27.614 16c0 6.41-5.205 11.647-11.612 11.647zm6.37-8.706c-.349-.175-2.064-1.018-2.384-1.134-.32-.116-.553-.175-.786.175-.232.349-.9 1.134-1.104 1.368-.203.232-.407.261-.755.087-.35-.175-1.475-.543-2.81-1.733-1.038-.927-1.739-2.07-1.942-2.42-.204-.348-.022-.537.153-.71.157-.156.35-.407.524-.61.175-.204.233-.35.35-.582.116-.233.058-.437-.03-.612-.087-.175-.786-1.894-1.077-2.594-.283-.682-.571-.589-.786-.6l-.669-.01c-.233 0-.612.087-.932.437-.32.349-1.223 1.194-1.223 2.913s1.252 3.38 1.426 3.613c.175.232 2.463 3.76 5.968 5.274.834.36 1.484.574 1.991.735.836.266 1.598.229 2.2.138.67-.1 2.065-.844 2.356-1.66.291-.815.291-1.514.204-1.66-.087-.146-.32-.233-.67-.408z"
					/>
				</svg>
			</div>
		</a>
	);
}
