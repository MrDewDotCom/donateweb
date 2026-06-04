import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import type { Donation } from "../types/donation";
import "./OverlayPage.css";


const socket = io("http://localhost:3000");

export default function OverlayPage() {
    const [donation, setDonation] =
        useState<Donation | null>(null);

    const [visible, setVisible] =
        useState(false);

    const [queue, setQueue] =
        useState<Donation[]>([]);

    const timerRef =
        useRef<number | null>(null);

    useEffect(() => {
        socket.on("donationPaid", (data: Donation) => {
            console.log("Donation Received", data);

            setQueue((prev) => {
                console.log("Adding to queue", data.id);

                return [...prev, data];
            });
        });

        return () => {
            socket.off("donationPaid");
        };
    }, []);

    useEffect(() => {
        console.log("Effect Run");

        if (visible) {
            console.log("Already visible");
            return;
        }

        if (queue.length === 0) {
            console.log("Queue empty");
            return;
        }

        const nextDonation = queue[0];

        console.log("Showing", nextDonation.id);

        setDonation(nextDonation);
        setVisible(true);

        timerRef.current = window.setTimeout(() => {
            console.log("Removing", nextDonation.id);

            setVisible(false);
            setDonation(null);

            setQueue((prev) => prev.slice(1));
        }, 5000);

    }, [queue, visible]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    if (!visible || !donation) {
        return null;
    }

    return (
        <div className="overlay">
            <h1>
                🎉 {donation.name}
            </h1>

            <h2>
                {donation.amount} บาท
            </h2>

            <p>
                {donation.message}
            </p>
        </div>
    );
}