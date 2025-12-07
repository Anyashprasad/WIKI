import { motion } from "framer-motion";
import { Github, Linkedin, Mail, Phone, Award, Briefcase, Code, GraduationCap, Terminal, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";

export default function About() {
    const [, setLocation] = useLocation();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100
            }
        }
    };

    return (
        <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
            {/* Header */}
            <header className="relative z-10 px-6 py-8 border-b border-gray-800">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setLocation("/")}>
                        <img
                            src="/logo.svg"
                            alt="WIKI Security Scanner"
                            className="h-8 w-auto"
                        />
                    </div>
                    <nav className="hidden md:flex items-center space-x-8">
                        <a href="/" className="text-white hover:text-green-400 transition-colors">Scanner</a>
                        <a href="/about" className="text-green-400 transition-colors">About Me</a>
                    </nav>
                </div>
            </header>

            <main className="relative z-10 px-6 py-12">
                <motion.div
                    className="max-w-4xl mx-auto"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Hero Section */}
                    <motion.div variants={itemVariants} className="text-center mb-16">
                        <div className="relative w-48 h-48 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-full border-4 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)] animate-pulse"></div>
                            <img
                                src="/profile.jpg"
                                alt="Anyash Prasad"
                                className="w-full h-full rounded-full object-cover border-4 border-black relative z-10"
                            />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                            Hi, I'm <span className="text-green-400">Anyash Prasad</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-6">
                            Cybersecurity Enthusiast & Full Stack Developer
                        </p>

                        <div className="flex flex-wrap justify-center gap-4 text-gray-300">
                            <a href="mailto:anyashprasad.work@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                                <Mail size={18} /> anyashprasad.work@gmail.com
                            </a>
                            <span className="hidden md:inline">|</span>
                            <a href="tel:8292181204" className="flex items-center gap-2 hover:text-white transition-colors">
                                <Phone size={18} /> 829-218-1204
                            </a>
                            <span className="hidden md:inline">|</span>
                            <a href="https://linkedin.com/in/anyash-prasad-03699a284" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                <Linkedin size={18} /> LinkedIn
                            </a>
                            <span className="hidden md:inline">|</span>
                            <a href="https://github.com/Anyashprasad" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                <Github size={18} /> GitHub
                            </a>
                        </div>
                    </motion.div>

                    {/* Executive Summary */}
                    <motion.div variants={itemVariants} className="mb-12">
                        <Card className="bg-gray-900 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-2xl text-green-400 flex items-center gap-2">
                                    <Terminal className="h-6 w-6" /> Executive Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-gray-300 leading-relaxed">
                                B.Tech Computer Science student at KIIT (CGPA 7.63/10) with hands-on experience in cybersecurity, secure application development, penetration testing (VAPT), and applied AI. Proficient in Python, Java, C, Linux, OOP, databases, and security tools. Skilled in building AI-based security models (DeepFake Detection using CNN/XceptionNet) and leading technical teams. Strong communicator with proven leadership as Project Lead during SAIL internship.
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Tech Stack Box */}
                    <motion.div variants={itemVariants} className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                            <Code className="h-6 w-6 text-green-400" /> Tech Stack
                        </h2>
                        <Card className="bg-gray-900 border-gray-700 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-green-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <CardContent className="p-8 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-green-400/10 rounded-lg">
                                                <Terminal className="h-5 w-5 text-green-400" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white">Programming & Tools</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {["Python", "Java", "C", "SQL", "Linux", "VMware", "Fortinet", "GitHub", "Flask"].map(skill => (
                                                <Badge key={skill} variant="outline" className="border-green-400/30 text-green-300 hover:bg-green-400/10 transition-colors py-1.5 px-3">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-blue-400/10 rounded-lg">
                                                <Bot className="h-5 w-5 text-blue-400" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white">Cybersecurity & AI</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {["Burp Suite", "OpenVAS", "Zenmap", "Wireshark", "Deep Learning", "CNN", "XceptionNet", "VAPT"].map(skill => (
                                                <Badge key={skill} variant="outline" className="border-blue-400/30 text-blue-300 hover:bg-blue-400/10 transition-colors py-1.5 px-3">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Experience */}
                    <motion.div variants={itemVariants} className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                            <Briefcase className="h-6 w-6 text-green-400" /> Experience
                        </h2>
                        <div className="space-y-6">
                            <Card className="bg-gray-900 border-gray-700">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl text-white">Steel Authority of India Ltd. (SAIL)</CardTitle>
                                            <p className="text-green-400">Intern, Project Lead</p>
                                        </div>
                                        <span className="text-sm text-gray-400">May 2025 – June 2025</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-gray-300">
                                    <ul className="list-disc list-inside space-y-2">
                                        <li>Developed and deployed a secure chatbot application using Flask, implementing security and cache-control headers.</li>
                                        <li>Led a 5-member team, managing timelines, technical reviews, and documentation.</li>
                                        <li>Produced a structured security-focused report aligning implementation with organizational standards.</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900 border-gray-700">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl text-white">Cybervault Society KIIT</CardTitle>
                                            <p className="text-green-400">Core Cybersecurity Member</p>
                                        </div>
                                        <span className="text-sm text-gray-400">Sep 2024 – Present</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-gray-300">
                                    <ul className="list-disc list-inside space-y-2">
                                        <li>Conducted VAPT on test systems, identifying 15+ vulnerabilities (TryHackMe labs).</li>
                                        <li>Improved problem-solving speed by 20% through CTFs and structured training.</li>
                                        <li>Delivered security awareness training, improving team compliance by 15%.</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900 border-gray-700">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl text-white">Eduskills Foundation</CardTitle>
                                            <p className="text-green-400">Intern</p>
                                        </div>
                                        <span className="text-sm text-gray-400">Nov 2024 – Dec 2024</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-gray-300">
                                    <ul className="list-disc list-inside space-y-2">
                                        <li>Hands-on training in network security implementation and threat detection using Fortinet tools.</li>
                                        <li>Learned cyber threat identification and mitigation strategies to strengthen system defenses.</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>

                    {/* Projects */}
                    <motion.div variants={itemVariants} className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                            <Code className="h-6 w-6 text-green-400" /> Projects
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-gray-900 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white">DeepFake Detector Neural Network</CardTitle>
                                </CardHeader>
                                <CardContent className="text-gray-300">
                                    Implemented a CNN-based model (based on XceptionNet) to detect deepfake media with &gt;95% accuracy on test dataset; trained and evaluated using FaceForensics++ dataset.
                                </CardContent>
                            </Card>
                            <Card className="bg-gray-900 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white">Python Keylogger</CardTitle>
                                </CardHeader>
                                <CardContent className="text-gray-300">
                                    Built a beginner-friendly keylogger for educational and security research (available on GitHub).
                                </CardContent>
                            </Card>
                            <Card className="bg-gray-900 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white">Virtual Lab Setup</CardTitle>
                                </CardHeader>
                                <CardContent className="text-gray-300">
                                    Configured VMware with Kali Linux & Windows for ethical hacking simulations.
                                </CardContent>
                            </Card>
                            <Card className="bg-gray-900 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white">CTF Challenges</CardTitle>
                                </CardHeader>
                                <CardContent className="text-gray-300">
                                    Solved 20+ challenges on TryHackMe & PicoCTF, strengthening cryptography, reverse engineering, OSINT, and web exploitation skills.
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>

                    {/* Education & Certifications */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div>
                            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                                <GraduationCap className="h-6 w-6 text-green-400" /> Education
                            </h2>
                            <Card className="bg-gray-900 border-gray-700 h-full">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white">Kalinga Institute of Industrial Technology (KIIT)</CardTitle>
                                    <p className="text-sm text-gray-400">B.Tech in Computer Science</p>
                                    <p className="text-sm text-green-400">Aug 2023 – Aug 2027 (Expected) | CGPA: 7.63/10</p>
                                </CardHeader>
                                <CardContent className="text-gray-300">
                                    <p className="text-sm">Relevant Coursework: Data Structures & Algorithms, Computer Architecture, Operating Systems, Database Systems</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                                <Award className="h-6 w-6 text-green-400" /> Certifications
                            </h2>
                            <Card className="bg-gray-900 border-gray-700 h-full">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Award className="h-5 w-5 text-green-400 mt-1" />
                                        <div>
                                            <p className="text-white font-medium">Fortinet Certified Fundamentals in Cybersecurity</p>
                                            <p className="text-sm text-gray-400">Dec 2024 – Dec 2026</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Award className="h-5 w-5 text-green-400 mt-1" />
                                        <div>
                                            <p className="text-white font-medium">Fortinet Network Security Expert Level 1: Certified Associate</p>
                                            <p className="text-sm text-gray-400">Dec 2024 – Dec 2026</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                </motion.div>
            </main>
            <Footer />
        </div>
    );
}
