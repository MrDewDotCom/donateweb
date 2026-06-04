import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { Donation } from "../types/donation";

const socket = io("http://localhost:3000");

export default function OverlayPage() {
    const [donation, setDonation] =
        useState<Donation | null>(null);

    useEffect(() => {
        socket.on("donationPaid", (data: Donation) => {
            console.log("ได้รับ Donation", data);

            setDonation(data);
        });

        return () => {
            socket.off("donationPaid");
        };
    }, []);

    if (!donation) {
        return (
            <div>
                รอการแจ้งเตือน...
            </div>
        );
    }

    return (
        <div>
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