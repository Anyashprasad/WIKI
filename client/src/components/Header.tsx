
import { Link, useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
    const [location] = useLocation();

    const isActive = (path: string) => location === path;

    // Mobile menu often needs to close on click, but SheetPrimitive handles some of that. 
    // For now, standard implementation.

    return (
        <header className="relative z-10 px-6 py-8 border-b border-gray-800 bg-black/50 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link href="/">
                    <div className="flex items-center space-x-3 cursor-pointer">
                        <img src="/logo.svg" alt="WIKI Security Scanner" className="h-8 w-auto" />
                    </div>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center space-x-8">
                    <Link href="/">
                        <a className={`transition-colors cursor-pointer ${isActive("/") ? "text-green-400" : "text-white hover:text-green-400"}`}>Scanner</a>
                    </Link>
                    <Link href="/about">
                        <a className={`transition-colors cursor-pointer ${isActive("/about") ? "text-green-400" : "text-white hover:text-green-400"}`}>About Me</a>
                    </Link>
                </nav>

                {/* Mobile Nav */}
                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="border-gray-700 bg-gray-900 text-white hover:bg-gray-800 hover:text-green-400">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-gray-900 border-gray-800 w-[240px] sm:w-[300px]">
                            <nav className="flex flex-col space-y-6 mt-8">
                                <Link href="/">
                                    <a className={`text-xl font-medium transition-colors ${isActive("/") ? "text-green-400" : "text-white hover:text-green-400"}`}>Scanner</a>
                                </Link>
                                <Link href="/about">
                                    <a className={`text-xl font-medium transition-colors ${isActive("/about") ? "text-green-400" : "text-white hover:text-green-400"}`}>About Me</a>
                                </Link>
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
