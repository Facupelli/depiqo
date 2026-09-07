import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Button } from "@repo/ui/components/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { cn } from "@repo/ui/lib/utils";
import { MenuIcon, XIcon } from "lucide-react";
import * as React from "react";

// Backoffice's local shadcn Sidebar adaptation. Keep this query aligned with
// the lg utilities below. Only modal presentation needs a JS media query.
const SIDEBAR_CONSTRAINED_QUERY = "(width < 64rem)";

function subscribeToViewport(onChange: () => void) {
	const query = window.matchMedia(SIDEBAR_CONSTRAINED_QUERY);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

function getConstrainedSnapshot() {
	return window.matchMedia(SIDEBAR_CONSTRAINED_QUERY).matches;
}

function getServerSnapshot() {
	return false;
}

type SidebarContextValue = {
	isConstrained: boolean;
	openMobile: boolean;
	setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
	toggleSidebar: () => void;
	triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
	const context = React.use(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.");
	}
	return context;
}

function SidebarProvider({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	const isConstrained = React.useSyncExternalStore(
		subscribeToViewport,
		getConstrainedSnapshot,
		getServerSnapshot,
	);
	const [openMobile, setOpenMobile] = React.useState(false);
	const triggerRef = React.useRef<HTMLButtonElement>(null);

	// A resize to the permanent presentation dismisses the modal and must not
	// reopen it if the viewport later becomes constrained again.
	if (!isConstrained && openMobile) {
		setOpenMobile(false);
	}

	function toggleSidebar() {
		if (isConstrained) setOpenMobile((open) => !open);
	}

	return (
		<SidebarContext
			value={{
				isConstrained,
				openMobile,
				setOpenMobile,
				toggleSidebar,
				triggerRef,
			}}
		>
			<div
				data-slot="sidebar-wrapper"
				className={cn(
					"flex min-h-svh w-full min-w-0 [--sidebar-width:17.5rem]",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</SidebarContext>
	);
}

function Sidebar({
	collapsible = "offcanvas",
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	// This shell deliberately has no icon-only or collapsed desktop mode.
	collapsible?: "offcanvas";
}) {
	const { isConstrained, openMobile, setOpenMobile, triggerRef } = useSidebar();

	if (isConstrained) {
		return (
			<Sheet open={openMobile} onOpenChange={setOpenMobile} modal>
				<SheetContent
					data-slot="sidebar"
					data-sidebar="sidebar"
					data-mobile="true"
					side="left"
					showCloseButton={false}
					finalFocus={triggerRef}
					className={cn(
						"gap-0 bg-sidebar p-0 text-sidebar-foreground data-[side=left]:h-svh data-[side=left]:w-[min(20rem,calc(100svw-3rem))]",
						className,
					)}
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Navegación principal</SheetTitle>
						<SheetDescription>
							Sucursales, navegación y cuenta de usuario.
						</SheetDescription>
					</SheetHeader>
					<SheetClose
						render={
							<Button
								variant="ghost"
								size="icon"
								className="absolute top-2 right-2 size-11 text-neutral-200 hover:bg-white/10 hover:text-white"
							/>
						}
					>
						<XIcon />
						<span className="sr-only">Cerrar navegación</span>
					</SheetClose>
					<div className="flex h-full min-h-0 w-full flex-col" {...props}>
						{children}
					</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<div
			data-slot="sidebar"
			data-collapsible={collapsible}
			className="hidden shrink-0 text-sidebar-foreground lg:block"
		>
			<div data-slot="sidebar-gap" className="w-(--sidebar-width)" />
			<div
				data-slot="sidebar-container"
				className={cn(
					"fixed inset-y-0 left-0 z-30 hidden h-svh w-(--sidebar-width) flex-col border-r bg-sidebar lg:flex",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</div>
	);
}

function SidebarTrigger({
	className,
	onClick,
	...props
}: React.ComponentProps<typeof Button>) {
	const { openMobile, toggleSidebar, triggerRef } = useSidebar();
	return (
		<Button
			ref={triggerRef}
			data-slot="sidebar-trigger"
			variant="ghost"
			size="icon"
			aria-haspopup="dialog"
			aria-expanded={openMobile}
			className={cn("size-11", className)}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) toggleSidebar();
			}}
			{...props}
		>
			<MenuIcon />
			<span className="sr-only">Abrir navegación</span>
		</Button>
	);
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-header"
			className={cn("flex shrink-0 flex-col gap-2 p-2", className)}
			{...props}
		/>
	);
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-content"
			className={cn(
				"flex min-h-0 flex-1 flex-col gap-2 overflow-auto",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-footer"
			className={cn("flex shrink-0 flex-col gap-2 p-2", className)}
			{...props}
		/>
	);
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu"
			className={cn("flex w-full min-w-0 flex-col gap-0.5", className)}
			{...props}
		/>
	);
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="sidebar-menu-item"
			className={cn("relative", className)}
			{...props}
		/>
	);
}

function SidebarMenuButton({
	render,
	className,
	...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
	return useRender({
		defaultTagName: "button",
		render,
		props: mergeProps<"button">(
			{
				className: cn(
					"flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:min-h-8 pointer-coarse:min-h-11 [&_svg]:size-4 [&_svg]:shrink-0",
					className,
				),
			},
			props,
		),
		state: { slot: "sidebar-menu-button", sidebar: "menu-button" },
	});
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu-sub"
			className={cn(
				"ml-5 mt-0.5 flex min-w-0 flex-col border-l border-sidebar-border pl-3",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarMenuSubItem({ ...props }: React.ComponentProps<"li">) {
	return <li data-slot="sidebar-menu-sub-item" {...props} />;
}

function SidebarMenuSubButton({
	render,
	className,
	...props
}: useRender.ComponentProps<"a"> & React.ComponentProps<"a">) {
	return useRender({
		defaultTagName: "a",
		render,
		props: mergeProps<"a">(
			{
				className: cn(
					"flex min-h-11 min-w-0 items-center rounded-md py-1 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:min-h-7 pointer-coarse:min-h-11",
					className,
				),
			},
			props,
		),
		state: { slot: "sidebar-menu-sub-button", sidebar: "menu-sub-button" },
	});
}

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
};
